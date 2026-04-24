using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly PaymentService _paymentService;

    public PaymentsController(PaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    private int GetCustomerId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET api/payments
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var payments = await _paymentService.GetAllAsync();
        return Ok(payments);
    }

    // GET api/payments/my
    [HttpGet("my")]
    public async Task<IActionResult> GetMyPayments()
    {
        var payments = await _paymentService.GetByCustomerAsync(GetCustomerId());
        return Ok(payments);
    }

    // GET api/payments/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var payment = await _paymentService.GetByIdAsync(id);
        if (payment == null)
            return NotFound(new { message = "Payment not found." });

        return Ok(payment);
    }

    // POST api/payments
    [HttpPost]
    public async Task<IActionResult> Create(PaymentCreateDto dto)
    {
        var (payment, error) = await _paymentService.CreateAsync(GetCustomerId(), dto);

        if (error != null)
            return BadRequest(new { message = error });

        return CreatedAtAction(nameof(GetById), new { id = payment!.PaymentId }, payment);
    }

    // POST api/payments/5/refund
    [HttpPost("{id}/refund")]
    public async Task<IActionResult> Refund(int id)
    {
        var (payment, error) = await _paymentService.RefundAsync(id, GetCustomerId());

        if (error != null)
            return BadRequest(new { message = error });

        return Ok(payment);
    }
}