using System.Net.Http.Json;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public class BookingNotificationService(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<BookingNotificationService> logger) : IBookingNotificationService
{
    private const string DefaultTicketEmailUrl = "https://duncan-exclamatory-synaptically.ngrok-free.dev/api/Tickets/send-email";

    public async Task<bool> TrySendTicketEmailAsync(TicketEmailRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
        {
            return false;
        }

        var endpointUrl = configuration["Notifications:TicketEmailUrl"];
        if (string.IsNullOrWhiteSpace(endpointUrl))
        {
            endpointUrl = DefaultTicketEmailUrl;
        }

        try
        {
            var client = httpClientFactory.CreateClient("TicketEmailApi");
            using var response = await client.PostAsJsonAsync(endpointUrl, request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning(
                "Ticket email API failed. Status: {StatusCode}, BookingReference: {BookingReference}, Response: {ResponseBody}",
                (int)response.StatusCode,
                request.BookingReference,
                body);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ticket email API exception for booking {BookingReference}", request.BookingReference);
            return false;
        }
    }
}
