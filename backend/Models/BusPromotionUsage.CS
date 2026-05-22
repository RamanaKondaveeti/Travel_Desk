namespace PickNBook.Api.Models;

public class BusPromotionUsage
{
    public int Id { get; set; }

    public int BusPromotionId { get; set; }

    public BusPromotion? Promotion { get; set; }

    public int BusReservationId { get; set; }

    public BusReservation? BusReservation { get; set; }

    public string UserId { get; set; } = string.Empty;

    public decimal DiscountAmountInr { get; set; }

    public string BookingStatus { get; set; }
        = string.Empty;

    public DateTime UsedAtUtc { get; set; }
}