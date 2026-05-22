using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Services;
using System.Security.Claims;
using System.Security.Cryptography;

namespace PickNBook.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IEmailService _emailService;
        private readonly PasswordHasher<User> _passwordHasher;
        private readonly int _adminOtpExpiryMinutes;
        private readonly int _adminMaxOtpAttempts;
        private const string AdminLoginOtpPurpose = "AdminLogin";
        private const string AdminPasswordResetOtpPurpose = "AdminPasswordReset";

        public AuthController(
            AppDbContext context,
            IJwtService jwtService,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _context = context;
            _jwtService = jwtService;
            _emailService = emailService;
            _passwordHasher = new PasswordHasher<User>();

            _adminOtpExpiryMinutes = Math.Clamp(
                configuration.GetValue<int?>("AdminAuth:OtpExpiryMinutes") ?? 5,
                1,
                30);

            _adminMaxOtpAttempts = Math.Clamp(
                configuration.GetValue<int?>("AdminAuth:MaxOtpAttempts") ?? 5,
                1,
                10);
        }

        // ---------------- REGISTER ----------------
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
                return BadRequest("Email already exists");

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                PhoneNumber = request.PhoneNumber,
                Email = normalizedEmail,
                Role = AuthRoles.User
            };

            user.PasswordHash =
                _passwordHasher.HashPassword(user, request.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok("User registered successfully");
        }

        // ---------------- LOGIN ----------------
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
                return Unauthorized("Invalid credentials");

            var result = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.Password);

            if (result == PasswordVerificationResult.Failed)
                return Unauthorized("Invalid credentials");

            if (AuthRoles.IsAdminScope(user.Role))
            {
                return StatusCode(StatusCodes.Status403Forbidden,
                    "Admin users must login using admin OTP flow.");
            }

            var token = _jwtService.GenerateToken(user, user.Role);

            return Ok(new
            {
                token,
                userId = user.Id,
                role = user.Role

            });
        }

        // ---------------- ADMIN LOGIN STEP-1 (PASSWORD -> SEND OTP) ----------------
        [HttpPost("admin/login/request-otp")]
        public async Task<IActionResult> RequestAdminLoginOtp(AdminLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required.");
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || !AuthRoles.IsAdminScope(user.Role))
            {
                return Unauthorized("Invalid admin credentials.");
            }

            var passwordResult = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.Password);

            if (passwordResult == PasswordVerificationResult.Failed)
            {
                return Unauthorized("Invalid admin credentials.");
            }

            var now = DateTime.UtcNow;

            await _context.OTPs
                .Where(o =>
                    o.UserId == user.Id &&
                    o.Purpose == AdminLoginOtpPurpose &&
                    !o.IsUsed)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(o => o.IsUsed, true));

            var otpCode = RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");
            var challengeId = Guid.NewGuid().ToString("N");

            _context.OTPs.Add(new OTP
            {
                UserId = user.Id,
                Code = BCrypt.Net.BCrypt.HashPassword(otpCode),
                Expiry = now.AddMinutes(_adminOtpExpiryMinutes),
                IsUsed = false,
                Purpose = AdminLoginOtpPurpose,
                ChallengeId = challengeId,
                FailedAttempts = 0
            });

            await _context.SaveChangesAsync();

            var emailBody = $@"
                <h3>Admin Login Verification</h3>
                <p>Your one-time OTP is:</p>
                <h2 style='color:#2d89ef'>{otpCode}</h2>
                <p>This OTP expires in {_adminOtpExpiryMinutes} minutes.</p>
                <p>If this was not you, please reset your password immediately.</p>";

            await _emailService.SendEmailAsync(
                user.Email,
                "PickNBook Admin Login OTP",
                emailBody);

            return Ok(new
            {
                message = "OTP sent to admin email.",
                challengeId,
                expiresInMinutes = _adminOtpExpiryMinutes
            });
        }

        // ---------------- ADMIN LOGIN STEP-2 (VERIFY OTP -> JWT) ----------------
        [HttpPost("admin/login/verify-otp")]
        public async Task<IActionResult> VerifyAdminLoginOtp(AdminLoginVerifyOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ChallengeId) || string.IsNullOrWhiteSpace(request.Otp))
            {
                return BadRequest("ChallengeId and Otp are required.");
            }

            var challengeId = request.ChallengeId.Trim();
            var now = DateTime.UtcNow;

            var otpRecord = await _context.OTPs
                .Include(o => o.User)
                .FirstOrDefaultAsync(o =>
                    o.ChallengeId == challengeId &&
                    o.Purpose == AdminLoginOtpPurpose &&
                    !o.IsUsed);

            if (otpRecord == null || otpRecord.Expiry <= now)
            {
                return BadRequest("Invalid or expired OTP.");
            }

            if (otpRecord.FailedAttempts >= _adminMaxOtpAttempts)
            {
                otpRecord.IsUsed = true;
                await _context.SaveChangesAsync();
                return BadRequest("OTP attempt limit reached. Please login again.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Otp, otpRecord.Code))
            {
                otpRecord.FailedAttempts += 1;
                if (otpRecord.FailedAttempts >= _adminMaxOtpAttempts)
                {
                    otpRecord.IsUsed = true;
                }

                await _context.SaveChangesAsync();
                return BadRequest("Invalid or expired OTP.");
            }

            var user = otpRecord.User;
            if (user == null)
            {
                return Unauthorized("Invalid admin credentials.");
            }

            if (!AuthRoles.IsAdminScope(user.Role))
            {
                return Unauthorized("Invalid admin credentials.");
            }

            otpRecord.IsUsed = true;
            await _context.SaveChangesAsync();

            var token = _jwtService.GenerateToken(user, user.Role);

            return Ok(new
            {
                token,
                userId = user.Id,
                role = user.Role
            });
        }

        // ---------------- ADMIN FORGOT PASSWORD ----------------
        [HttpPost("admin/forgot-password")]
        public async Task<IActionResult> AdminForgotPassword(ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest("Email is required.");
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || !AuthRoles.IsAdminScope(user.Role))
            {
                return Ok("If the email is registered, an OTP has been sent.");
            }

            await _context.OTPs
                .Where(o =>
                    o.UserId == user.Id &&
                    o.Purpose == AdminPasswordResetOtpPurpose &&
                    !o.IsUsed)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(o => o.IsUsed, true));

            var otpCode = RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");

            _context.OTPs.Add(new OTP
            {
                UserId = user.Id,
                Code = BCrypt.Net.BCrypt.HashPassword(otpCode),
                Expiry = DateTime.UtcNow.AddMinutes(_adminOtpExpiryMinutes),
                IsUsed = false,
                Purpose = AdminPasswordResetOtpPurpose,
                ChallengeId = null,
                FailedAttempts = 0
            });

            await _context.SaveChangesAsync();

            var emailBody = $@"
                <h3>Admin Password Reset</h3>
                <p>Your one-time OTP is:</p>
                <h2 style='color:#2d89ef'>{otpCode}</h2>
                <p>This OTP expires in {_adminOtpExpiryMinutes} minutes.</p>
                <p>If this was not you, please contact support immediately.</p>";

            await _emailService.SendEmailAsync(
                user.Email,
                "PickNBook Admin Password Reset OTP",
                emailBody);

            return Ok("If the email is registered, an OTP has been sent.");
        }

        // ---------------- ADMIN RESET PASSWORD ----------------
        [HttpPost("admin/reset-password")]
        public async Task<IActionResult> AdminResetPassword(AdminResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Otp) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Email, OTP and new password are required.");
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || !AuthRoles.IsAdminScope(user.Role))
            {
                return BadRequest("Invalid or expired OTP.");
            }

            var now = DateTime.UtcNow;

            var otpRecord = await _context.OTPs
                .Where(o =>
                    o.UserId == user.Id &&
                    o.Purpose == AdminPasswordResetOtpPurpose &&
                    !o.IsUsed)
                .OrderByDescending(o => o.Id)
                .FirstOrDefaultAsync();

            if (otpRecord == null || otpRecord.Expiry <= now)
            {
                return BadRequest("Invalid or expired OTP.");
            }

            if (otpRecord.FailedAttempts >= _adminMaxOtpAttempts)
            {
                otpRecord.IsUsed = true;
                await _context.SaveChangesAsync();
                return BadRequest("OTP attempt limit reached. Please request a new OTP.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Otp, otpRecord.Code))
            {
                otpRecord.FailedAttempts += 1;
                if (otpRecord.FailedAttempts >= _adminMaxOtpAttempts)
                {
                    otpRecord.IsUsed = true;
                }

                await _context.SaveChangesAsync();
                return BadRequest("Invalid or expired OTP.");
            }

            var newPasswordCheck = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.NewPassword);

            if (newPasswordCheck != PasswordVerificationResult.Failed)
            {
                return BadRequest("New password must be different from current password.");
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
            otpRecord.IsUsed = true;
            await _context.SaveChangesAsync();

            await _context.OTPs
                .Where(o =>
                    o.UserId == user.Id &&
                    o.Purpose == AdminPasswordResetOtpPurpose &&
                    !o.IsUsed &&
                    o.Id != otpRecord.Id)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(o => o.IsUsed, true));

            return Ok("Admin password reset successful.");
        }

        // ---------------- CREATE ADMIN (SUPERADMIN ONLY) ----------------
        [Authorize(Roles = AuthRoles.SuperAdmin)]
        [HttpPost("admin/create")]
        public async Task<IActionResult> CreateAdmin(CreateAdminRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName) ||
                string.IsNullOrWhiteSpace(request.LastName) ||
                string.IsNullOrWhiteSpace(request.PhoneNumber) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("First name, last name, phone number, email and password are required.");
            }

            if (request.Password.Length < 8)
            {
                return BadRequest("Password must be at least 8 characters.");
            }

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var firstName = request.FirstName.Trim();
            var lastName = request.LastName.Trim();
            var phoneNumber = request.PhoneNumber.Trim();

            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
            {
                return BadRequest("Email already exists");
            }

            var adminUser = new User
            {
                FirstName = firstName,
                LastName = lastName,
                PhoneNumber = phoneNumber,
                Email = normalizedEmail,
                Role = AuthRoles.Admin
            };

            adminUser.PasswordHash = _passwordHasher.HashPassword(adminUser, request.Password);

            _context.Users.Add(adminUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Admin created successfully",
                userId = adminUser.Id,
                email = adminUser.Email,
                role = adminUser.Role
            });
        }

        // ---------------- LIST ADMINS (SUPERADMIN ONLY) ----------------
        [Authorize(Roles = AuthRoles.SuperAdmin)]
        [HttpGet("admin/list")]
        public async Task<IActionResult> GetAdminList()
        {
            var admins = await _context.Users
                .Where(u => u.Role.ToLower() == AuthRoles.Admin.ToLower())
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    userId = u.Id,
                    firstName = u.FirstName,
                    lastName = u.LastName,
                    email = u.Email,
                    phoneNumber = u.PhoneNumber,
                    role = u.Role,
                    createdAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                count = admins.Count,
                admins
            });
        }

        // ---------------- DELETE ADMIN (SUPERADMIN ONLY) ----------------
        [Authorize(Roles = AuthRoles.SuperAdmin)]
        [HttpDelete("admin/{adminId:int}")]
        public async Task<IActionResult> DeleteAdmin(int adminId)
        {
            var callerUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(callerUserIdClaim, out var callerUserId))
            {
                return Unauthorized("Invalid token");
            }

            if (adminId == callerUserId)
            {
                return BadRequest("You cannot delete your own account.");
            }

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == adminId);
            if (targetUser == null)
            {
                return NotFound("Admin not found.");
            }

            if (!string.Equals(targetUser.Role, AuthRoles.Admin, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Only Admin accounts can be deleted.");
            }

            _context.Users.Remove(targetUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Admin deleted successfully",
                userId = adminId
            });
        }

        // ---------------- FORGOT PASSWORD ----------------
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            // Prevent email enumeration attack
            if (user == null)
                return Ok("If the email is registered, an OTP has been sent.");

            var otpCode = new Random().Next(100000, 999999).ToString();

            var otp = new OTP
            {
                UserId = user.Id,
                Code = BCrypt.Net.BCrypt.HashPassword(otpCode), // Hash OTP
                Expiry = DateTime.UtcNow.AddMinutes(10),
                IsUsed = false,
                Purpose = "PasswordReset",
                ChallengeId = null,
                FailedAttempts = 0
            };

            _context.OTPs.Add(otp);
            await _context.SaveChangesAsync();

            var emailBody = $@"
                <h3>Password Reset Request</h3>
                <p>Your OTP is:</p>
                <h2 style='color:#2d89ef'>{otpCode}</h2>
                <p>This OTP will expire in 10 minutes.</p>
                <br/>
                <p>If you did not request this, please ignore this email.</p>
            ";

            await _emailService.SendEmailAsync(
                user.Email,
                "PickNBook Password Reset OTP",
                emailBody);

            return Ok("If the email is registered, an OTP has been sent.");
        }

        // ---------------- RESET PASSWORD ----------------
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
        {
            var otpRecords = await _context.OTPs
                .Include(o => o.User)
                .Where(o =>
                    o.Purpose == "PasswordReset" &&
                    !o.IsUsed &&
                    o.Expiry > DateTime.UtcNow)
                .OrderByDescending(o => o.Id)
                .ToListAsync();

            var otpRecord = otpRecords
                .FirstOrDefault(o => BCrypt.Net.BCrypt.Verify(request.OTP, o.Code));

            if (otpRecord == null)
                return BadRequest("Invalid or expired OTP");

            var user = otpRecord.User;

            user!.PasswordHash =
                _passwordHasher.HashPassword(user, request.NewPassword);

            otpRecord.IsUsed = true;

            await _context.SaveChangesAsync();

            return Ok("Password reset successful");
        }

        // ---------------- CHANGE PASSWORD ----------------
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.OldPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("Old password and new password are required");
            }

            if (request.OldPassword == request.NewPassword)
            {
                return BadRequest("New password must be different from old password");
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized("Invalid token");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return Unauthorized("User not found");
            }

            var passwordCheck = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.OldPassword);

            if (passwordCheck == PasswordVerificationResult.Failed)
            {
                return BadRequest("Old password is incorrect");
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok("Password changed successfully");
        }

        // ---------------- ADMIN CHANGE PASSWORD ----------------
        [Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
        [HttpPost("admin/change-password")]
        public Task<IActionResult> ChangeAdminPassword(ChangePasswordRequest request)
        {
            return ChangePassword(request);
        }
    }
}
