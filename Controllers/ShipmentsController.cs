using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private readonly ShipmentService _shipmentService;

    public ShipmentsController(ShipmentService shipmentService)
    {
        _shipmentService = shipmentService;
    }

    private int GetCustomerId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET api/shipments — Admin
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var shipments = await _shipmentService.GetAllAsync();
        return Ok(shipments);
    }

    // GET api/shipments/my — Customer
    [HttpGet("my")]
    public async Task<IActionResult> GetMyShipments()
    {
        var shipments = await _shipmentService.GetByCustomerAsync(GetCustomerId());
        return Ok(shipments);
    }

    // GET api/shipments/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var shipment = await _shipmentService.GetByIdAsync(id);
        if (shipment == null)
            return NotFound(new { message = "Shipment not found." });

        return Ok(shipment);
    }

    // POST api/shipments — Create Shipment
    [HttpPost]
    public async Task<IActionResult> Create(ShipmentCreateDto dto)
    {
        var (shipment, error) = await _shipmentService.CreateAsync(dto);

        if (error != null)
            return BadRequest(new { message = error });

        return CreatedAtAction(nameof(GetById),
            new { id = shipment!.ShipmentId }, shipment);
    }

    // PATCH api/shipments/5/status — Update Status
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, ShipmentUpdateDto dto)
    {
        var (shipment, error) = await _shipmentService.UpdateStatusAsync(id, dto);

        if (error != null)
            return BadRequest(new { message = error });

        return Ok(shipment);
    }
}