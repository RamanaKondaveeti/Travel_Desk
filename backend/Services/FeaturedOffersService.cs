using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public interface IFeaturedOffersService
{
    Task<IReadOnlyList<FeaturedOfferDto>> GetFeaturedOffersAsync();
    Task<ApplyOfferCouponResponse> ApplyCouponAsync(ApplyOfferCouponRequest request);
}

public class FeaturedOffersService : IFeaturedOffersService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string? _publicApiBaseUrl;

    public FeaturedOffersService(
        AppDbContext context,
        IHttpContextAccessor httpContextAccessor,
        IConfiguration configuration)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _publicApiBaseUrl = configuration["PublicApiBaseUrl"]?.Trim().TrimEnd('/');
    }

    public async Task<IReadOnlyList<FeaturedOfferDto>> GetFeaturedOffersAsync()
    {
        await EnsureSeededAsync();

        var now = DateTime.UtcNow;

        var offers = await _context.FeaturedOffers
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.OfferCode)
            .ToListAsync();

        return offers
            .Select(x => MapOfferToDto(x, now))
            .ToList();
    }

    public async Task<ApplyOfferCouponResponse> ApplyCouponAsync(ApplyOfferCouponRequest request)
    {
        await EnsureSeededAsync();

        if (string.IsNullOrWhiteSpace(request.OfferId) || string.IsNullOrWhiteSpace(request.CouponCode))
        {
            return new ApplyOfferCouponResponse
            {
                IsSuccess = false,
                Message = "OfferId and CouponCode are required."
            };
        }

        var offer = await _context.FeaturedOffers
            .FirstOrDefaultAsync(x => x.OfferCode == request.OfferId);

        if (offer == null)
        {
            return new ApplyOfferCouponResponse
            {
                IsSuccess = false,
                Message = "Offer not found."
            };
        }

        if (!string.Equals(offer.CouponCode, request.CouponCode, StringComparison.OrdinalIgnoreCase))
        {
            return BuildFailedCouponResponse(offer, "Invalid coupon for selected offer.");
        }

        var now = DateTime.UtcNow;
        if (!offer.IsActive || now > offer.CouponExpiresAtUtc)
        {
            return BuildFailedCouponResponse(offer, "Coupon has expired or is inactive.");
        }

        if (offer.CouponUsedCount >= offer.MaxCouponUsage)
        {
            return BuildFailedCouponResponse(offer, "Coupon usage limit has been reached.");
        }

        var originalPrice = request.CurrentPrice.GetValueOrDefault(offer.BasePrice);
        if (originalPrice <= 0)
        {
            return BuildFailedCouponResponse(offer, "Price must be greater than zero.");
        }

        var discountAmount = CalculateDiscountAmount(
            originalPrice,
            offer.IsPercentageDiscount,
            offer.DiscountValue);

        var finalPrice = Math.Round(
            Math.Max(0m, originalPrice - discountAmount),
            2,
            MidpointRounding.AwayFromZero);

        var strategy = _context.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _context.Database.BeginTransactionAsync();

            var rowsUpdated = await _context.FeaturedOffers
                .Where(x =>
                    x.Id == offer.Id &&
                    x.IsActive &&
                    x.CouponExpiresAtUtc >= now &&
                    x.CouponUsedCount < x.MaxCouponUsage)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.CouponUsedCount, x => x.CouponUsedCount + 1)
                    .SetProperty(x => x.UpdatedAtUtc, _ => now));

            if (rowsUpdated == 0)
            {
                await tx.RollbackAsync();
                return;
            }

            _context.CouponRedemptions.Add(new CouponRedemption
            {
                FeaturedOfferId = offer.Id,
                OfferCode = offer.OfferCode,
                CouponCode = offer.CouponCode,
                OriginalPrice = Math.Round(originalPrice, 2, MidpointRounding.AwayFromZero),
                DiscountAmount = discountAmount,
                FinalPrice = finalPrice,
                RedeemedAtUtc = now
            });

            await _context.SaveChangesAsync();
            await tx.CommitAsync();
        });

        var updatedOffer = await _context.FeaturedOffers
            .AsNoTracking()
            .FirstAsync(x => x.Id == offer.Id);

        return new ApplyOfferCouponResponse
        {
            IsSuccess = true,
            Message = "Coupon applied successfully.",
            OfferId = updatedOffer.OfferCode,
            CouponCode = updatedOffer.CouponCode,
            CouponExpiresAtUtc = updatedOffer.CouponExpiresAtUtc,
            MaxCouponUsage = updatedOffer.MaxCouponUsage,
            CouponUsedCount = updatedOffer.CouponUsedCount,
            RemainingCouponUsage = Math.Max(0, updatedOffer.MaxCouponUsage - updatedOffer.CouponUsedCount),
            OriginalPrice = Math.Round(originalPrice, 2, MidpointRounding.AwayFromZero),
            DiscountAmount = discountAmount,
            FinalPrice = finalPrice
        };
    }

    private ApplyOfferCouponResponse BuildFailedCouponResponse(FeaturedOffer offer, string message)
    {
        return new ApplyOfferCouponResponse
        {
            IsSuccess = false,
            Message = message,
            OfferId = offer.OfferCode,
            CouponCode = offer.CouponCode,
            CouponExpiresAtUtc = offer.CouponExpiresAtUtc,
            MaxCouponUsage = offer.MaxCouponUsage,
            CouponUsedCount = offer.CouponUsedCount,
            RemainingCouponUsage = Math.Max(0, offer.MaxCouponUsage - offer.CouponUsedCount),
            OriginalPrice = offer.BasePrice,
            DiscountAmount = 0m,
            FinalPrice = offer.BasePrice
        };
    }

    private FeaturedOfferDto MapOfferToDto(FeaturedOffer offer, DateTime now)
    {
        var previewDiscountAmount = CalculateDiscountAmount(
            offer.BasePrice,
            offer.IsPercentageDiscount,
            offer.DiscountValue);

        var remaining = Math.Max(0, offer.MaxCouponUsage - offer.CouponUsedCount);
        var isActive = offer.IsActive && offer.CouponExpiresAtUtc >= now && remaining > 0;

        return new FeaturedOfferDto
        {
            OfferId = offer.OfferCode,
            Title = offer.Title,
            Subtitle = offer.Subtitle,
            Description = offer.Description,
            CouponCode = offer.CouponCode,
            BasePrice = offer.BasePrice,
            IsPercentageDiscount = offer.IsPercentageDiscount,
            DiscountValue = offer.DiscountValue,
            CouponExpiresAtUtc = offer.CouponExpiresAtUtc,
            MaxCouponUsage = offer.MaxCouponUsage,
            CouponUsedCount = offer.CouponUsedCount,
            RemainingCouponUsage = remaining,
            IsCouponActive = isActive,
            ImageUrl = ResolveImageUrl(offer.ImageUrl),
            BookingType = offer.BookingType,
            PreviewFinalPrice = Math.Round(
                Math.Max(0m, offer.BasePrice - previewDiscountAmount),
                2,
                MidpointRounding.AwayFromZero)
        };
    }

    private string ResolveImageUrl(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return string.Empty;
        }

        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var absolute))
        {
            return absolute.ToString();
        }

        var normalizedPath = imageUrl.StartsWith('/') ? imageUrl : $"/{imageUrl}";

        if (!string.IsNullOrWhiteSpace(_publicApiBaseUrl))
        {
            return $"{_publicApiBaseUrl}{normalizedPath}";
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        if (request == null || !request.Host.HasValue)
        {
            return normalizedPath;
        }

        var host = request.Host.Host;
        var scheme = request.Scheme;

        // Default to HTTPS for non-local hosts to avoid mixed-content issues in browsers.
        if (!string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            scheme = "https";
        }

        return $"{scheme}://{request.Host}{request.PathBase}{normalizedPath}";
    }

    private static decimal CalculateDiscountAmount(decimal originalPrice, bool isPercentage, decimal discountValue)
    {
        if (discountValue <= 0 || originalPrice <= 0)
        {
            return 0m;
        }

        var discount = isPercentage
            ? (originalPrice * discountValue) / 100m
            : discountValue;

        return Math.Round(Math.Min(discount, originalPrice), 2, MidpointRounding.AwayFromZero);
    }

    private async Task EnsureSeededAsync()
    {
        if (await _context.FeaturedOffers.AnyAsync())
            return;

        var now = DateTime.UtcNow;
        var expiry = now.AddMonths(6);

        var offers = new List<FeaturedOffer>
        {
            new() { OfferCode = "OFR001", Title = "Flight Special Deal", Subtitle = "Save Big", Description = "Save up to 20% on selected domestic routes.", CouponCode = "FLY20", BasePrice = 5200m, IsPercentageDiscount = true, DiscountValue = 20m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 500, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/flight-special-deal.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR002", Title = "Monsoon Express", Subtitle = "Rainy Sale", Description = "Monsoon season discount for weekend travelers.", CouponCode = "RAIN15", BasePrice = 4600m, IsPercentageDiscount = true, DiscountValue = 15m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 450, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/monsoon-express.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR003", Title = "Bus Buddy Flat Fare", Subtitle = "Quick Save", Description = "Flat INR 300 off for short-haul bookings.", CouponCode = "BUSBUDDY", BasePrice = 2200m, IsPercentageDiscount = false, DiscountValue = 300m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 350, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/bus-buddy.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR004", Title = "City Hopper", Subtitle = "Metro Saver", Description = "Perfect for frequent city-to-city flyers.", CouponCode = "HOPPER12", BasePrice = 4100m, IsPercentageDiscount = true, DiscountValue = 12m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 300, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/city-hopper.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR005", Title = "Weekend Blast", Subtitle = "Fri-Sun Offer", Description = "Discount valid for weekend departures only.", CouponCode = "WEEKEND10", BasePrice = 5900m, IsPercentageDiscount = true, DiscountValue = 10m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 325, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/weekend-blast.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR006", Title = "Early Bird", Subtitle = "Plan Ahead", Description = "Book early and unlock a flat discount.", CouponCode = "EARLY500", BasePrice = 6800m, IsPercentageDiscount = false, DiscountValue = 500m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 280, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/early-bird.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR007", Title = "Family Pack", Subtitle = "Group Friendly", Description = "Family travelers can save with this coupon.", CouponCode = "FAM18", BasePrice = 8400m, IsPercentageDiscount = true, DiscountValue = 18m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 250, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/family-pack.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR008", Title = "Night Owl", Subtitle = "Late Flights", Description = "Special discount for red-eye and late departures.", CouponCode = "OWL350", BasePrice = 3700m, IsPercentageDiscount = false, DiscountValue = 350m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 300, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/night-owl.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR009", Title = "Student Saver", Subtitle = "Campus Route", Description = "Student-focused fare cuts for selected sectors.", CouponCode = "STUDY14", BasePrice = 4300m, IsPercentageDiscount = true, DiscountValue = 14m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 400, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/student-saver.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR010", Title = "Corporate Connect", Subtitle = "Business Travel", Description = "Business route offer with instant savings.", CouponCode = "CORP600", BasePrice = 9200m, IsPercentageDiscount = false, DiscountValue = 600m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 220, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/corporate-connect.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR011", Title = "Festive Joy", Subtitle = "Holiday Rush", Description = "Festive travel season discount.", CouponCode = "FEST16", BasePrice = 7600m, IsPercentageDiscount = true, DiscountValue = 16m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 260, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/festive-joy.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR012", Title = "Round Trip Booster", Subtitle = "Return Saver", Description = "Extra value for round-trip bookings.", CouponCode = "ROUND450", BasePrice = 7000m, IsPercentageDiscount = false, DiscountValue = 450m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 240, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/round-trip.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR013", Title = "Premium Escape", Subtitle = "Luxury Promo", Description = "Premium flight deal with high-value discount.", CouponCode = "PREM22", BasePrice = 12500m, IsPercentageDiscount = true, DiscountValue = 22m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 180, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/premium-escape.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR014", Title = "Quick Fly", Subtitle = "Flash Sale", Description = "Flash sale with limited-time reduction.", CouponCode = "QUICK250", BasePrice = 3100m, IsPercentageDiscount = false, DiscountValue = 250m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 360, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/quick-fly.png", CreatedAtUtc = now, UpdatedAtUtc = now },
            new() { OfferCode = "OFR015", Title = "Mega Miles", Subtitle = "Big Savings", Description = "Heavy discount for long-distance routes.", CouponCode = "MEGA25", BasePrice = 9800m, IsPercentageDiscount = true, DiscountValue = 25m, CouponExpiresAtUtc = expiry, MaxCouponUsage = 200, CouponUsedCount = 0, IsActive = true, ImageUrl = "/offers/mega-miles.png", CreatedAtUtc = now, UpdatedAtUtc = now }
        };

        _context.FeaturedOffers.AddRange(offers);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Ignore if another request seeded concurrently.
        }
    }
}
