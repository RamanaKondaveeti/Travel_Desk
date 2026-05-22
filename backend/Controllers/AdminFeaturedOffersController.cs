using Microsoft.AspNetCore.Mvc;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Controllers
{
    public class AdminFeaturedOffersController
     : AdminApiController
    {
        private readonly IAdminFeaturedOffersService
            _service;

        public AdminFeaturedOffersController(
            IAdminFeaturedOffersService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var offers = await _service.GetAllAsync();

            return Ok(offers);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var offer = await _service.GetByIdAsync(id);

            if (offer == null)
            {
                return NotFound(new
                {
                    message = "Offer not found."
                });
            }

            return Ok(offer);
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromForm] AdminFeaturedOfferRequestDto request)
        {
            var result =
                await _service.CreateAsync(request);

            return Ok(new
            {
                message =
                    "Offer created successfully.",
                data = result
            });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
              [FromForm] AdminFeaturedOfferRequestDto request)
        {
            var result =
                await _service.UpdateAsync(
                    id,
                    request);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Offer not found."
                });
            }

            return Ok(new
            {
                message =
                    "Offer updated successfully.",
                data = result
            });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(
            int id)
        {
            var deleted =
                await _service.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Offer not found."
                });
            }

            return Ok(new
            {
                message =
                    "Offer deleted successfully."
            });
        }
    }
}
