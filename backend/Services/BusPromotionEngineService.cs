using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public class BusPromotionEngineService
    : IBusPromotionEngineService
{
    private readonly AppDbContext _db;

    private static readonly TimeSpan IndiaOffset =
        TimeSpan.FromHours(5.5);

    public BusPromotionEngineService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<BusPricingPreviewResponseDto>
        CalculateAsync(
            int busId,
            List<string> seatCodes,
            string? couponCode,
            int? promotionId,
            int? userId = null)
    {
        var bus = await _db.BusBookings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == busId);

        if (bus is null)
            throw new Exception("Bus not found.");

        var seats = await _db.BusSeats
            .AsNoTracking()
            .Where(x =>
                x.BusBookingId == busId &&
                seatCodes.Contains(x.SeatCode))
            .ToListAsync();

        var response =
            new BusPricingPreviewResponseDto
            {
                BusId = bus.Id,
                GstCategory = bus.GstCategory,
                CouponAllowed = true
            };

        decimal subtotal = 0m;

        foreach (var seat in seats)
        {
            var markup = await _db.BusMarkupSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Status == "Active" &&
                    x.SeatType == seat.SeatType);

            decimal markupAmount = 0m;

            if (markup != null)
            {
                markupAmount =
                    markup.MarkupType.Equals(
                        "Percentage",
                        StringComparison.OrdinalIgnoreCase)
                    ? bus.PriceInr * markup.Value / 100m
                    : markup.Value;
            }

            var fareBeforeTax =
                bus.PriceInr + markupAmount;

            subtotal += fareBeforeTax;

            response.Seats.Add(
                new BusSeatPriceBreakdownDto
                {
                    SeatCode = seat.SeatCode,
                    SeatType = seat.SeatType,
                    BaseFare = bus.PriceInr,
                    MarkupAmount = decimal.Round(
                        markupAmount,
                        2),
                    FareBeforeTax = decimal.Round(
                        fareBeforeTax,
                        2)
                });
        }

        response.SubtotalBeforeCoupon =
            decimal.Round(subtotal, 2);
        // ========================================
        // AUTO APPLY PROMOTIONS
        // ========================================

        // ========================================
        // BEST AUTO APPLY PROMOTION ONLY
        // ========================================

        decimal autoDiscount = 0m;

        BusPromotion? bestAutoPromotion = null;

        decimal bestAutoDiscount = 0m;

        var autoPromotions = await _db.BusPromotions
            .Include(x => x.Conditions)
            .Where(x =>
                x.IsActive &&
                x.IsAutoApply)
            .OrderByDescending(x => x.Priority)
            .ToListAsync();

        foreach (var promo in autoPromotions)
        {
            if (!ValidatePromotionConditions(
                    promo,
                    bus,
                    seats))
            {
                continue;
            }

            decimal amount =
                promo.DiscountType.Equals(
                    "Percentage",
                    StringComparison.OrdinalIgnoreCase)
                ? subtotal * promo.DiscountValue / 100m
                : promo.DiscountValue;

            if (promo.MaxDiscountAmount.HasValue)
            {
                amount = Math.Min(
                    amount,
                    promo.MaxDiscountAmount.Value);
            }

            if (amount > bestAutoDiscount)
            {
                bestAutoDiscount = amount;
                bestAutoPromotion = promo;
            }
        }

        autoDiscount = bestAutoDiscount;
        if (bestAutoPromotion != null)
        {
            response.AutoPromotionCode =
                bestAutoPromotion.Code;
        }

        // ========================================
        // USER COUPON / MANUAL PROMOTION
        // ========================================

        BusPromotion? userPromotion = null;

        if (!string.IsNullOrWhiteSpace(couponCode))
        {
            userPromotion = await _db.BusPromotions
                .Include(x => x.Conditions)
                .FirstOrDefaultAsync(x =>
                    x.Code == couponCode &&
                    x.IsActive);
        }
        else if (promotionId.HasValue)
        {
            userPromotion = await _db.BusPromotions
                .Include(x => x.Conditions)
                .FirstOrDefaultAsync(x =>
                    x.Id == promotionId.Value &&
                    x.IsActive);
        }

        decimal couponDiscount = 0m;

        if (userPromotion != null)
        {
            bool valid =
                ValidatePromotionConditions(
                    userPromotion,
                    bus,
                    seats);

            if (valid)
            {
                couponDiscount =
                    userPromotion.DiscountType.Equals(
                        "Percentage",
                        StringComparison.OrdinalIgnoreCase)
                    ? subtotal *
                        userPromotion.DiscountValue / 100m
                    : userPromotion.DiscountValue;

                if (userPromotion.MaxDiscountAmount.HasValue)
                {
                    couponDiscount = Math.Min(
                        couponDiscount,
                        userPromotion.MaxDiscountAmount.Value);
                }

                response.AppliedPromotionCode =
                    userPromotion.Code;

                response.AppliedPromotionTitle =
                    userPromotion.Title;

                response.AppliedPromotionType =
                    userPromotion.PromotionType;

                response.DiscountSource =
                    userPromotion.PromotionType;
            }
        }

        // ========================================
        // ROUNDING
        // ========================================

        autoDiscount =
            decimal.Round(
                autoDiscount,
                2,
                MidpointRounding.AwayFromZero);

        couponDiscount =
            decimal.Round(
                couponDiscount,
                2,
                MidpointRounding.AwayFromZero);

        // ========================================
        // RESPONSE DISCOUNT FIELDS
        // ========================================

        response.AutoDiscountAmount =
            autoDiscount;

        response.CouponDiscountAmount =
            couponDiscount;

        var totalDiscount =
            Math.Min(
                autoDiscount +
                couponDiscount,
                subtotal);

        response.CouponAmount =
            totalDiscount;

        // ========================================
        // TAXABLE FARE
        // ========================================

        var taxableFare =
            subtotal - totalDiscount;

        response.TaxableFare =
            decimal.Round(
                taxableFare,
                2);

        // ========================================
        // GST
        // ========================================

        var gstSetting =
            await _db.BusGstSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Status == "Active" &&
                    x.GstCategory == bus.GstCategory);

        response.GstPercent =
            gstSetting?.GstPercent ?? 0m;

        response.GstAmount =
            decimal.Round(
                taxableFare *
                response.GstPercent / 100m,
                2);

        // ========================================
        // CONVENIENCE FEE
        // ========================================

        var convenienceFee =
            await _db.BusConvenienceFees
                .AsNoTracking()
                .Where(x => x.Status == "Active")
                .OrderByDescending(x => x.Id)
                .Select(x => x.FeeInr)
                .FirstOrDefaultAsync();

        response.ConvenienceFee =
            convenienceFee;

        // ========================================
        // GRAND TOTAL
        // ========================================

        response.GrandTotal =
            decimal.Round(
                taxableFare +
                response.GstAmount +
                convenienceFee,
                2);

        return response;
    }

    private bool ValidatePromotionConditions(
        BusPromotion promotion,
        BusBooking bus,
        List<BusSeat> seats)
    {
        if (promotion.Conditions == null ||
            promotion.Conditions.Count == 0)
            return true;

        var istDeparture =
            DateTime.SpecifyKind(
                bus.DepartureTime,
                DateTimeKind.Utc)
            .Add(IndiaOffset);

        foreach (var condition in promotion.Conditions)
        {
            switch (condition.ConditionType)
            {
                case "DayOfWeek":

                    if (!istDeparture.DayOfWeek
                        .ToString()
                        .Equals(
                            condition.Value1,
                            StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }

                    break;

                case "SourceCity":

                    if (!bus.FromCity.Equals(
                        condition.Value1,
                        StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }

                    break;

                case "DestinationCity":

                    if (!bus.ToCity.Equals(
                        condition.Value1,
                        StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }

                    break;

                case "SeatType":

                    if (!seats.Any(x =>
                        x.SeatType.Equals(
                            condition.Value1,
                            StringComparison.OrdinalIgnoreCase)))
                    {
                        return false;
                    }

                    break;

                case "BusType":

                    if (!bus.BusType.Equals(
                        condition.Value1,
                        StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }

                    break;

                case "OperatorName":

                    if (!bus.OperatorName.Equals(
                        condition.Value1,
                        StringComparison.OrdinalIgnoreCase))
                    {
                        return false;
                    }

                    break;
            }
        }

        return true;
    }
}