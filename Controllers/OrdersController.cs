using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // كل الـ Endpoints محتاجة Login
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrdersController(OrderService orderService)
    {
        _orderService = orderService;
    }

    // مساعد لجيب الـ CustomerId من الـ Token
    private int GetCustomerId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET api/orders/my  ← أوردرات الكاستومر الحالي
    [HttpGet("my")]
    public async Task<IActionResult> GetMyOrders()
    {
        var orders = await _orderService.GetByCustomerAsync(GetCustomerId());
        return Ok(orders);
    }

    // GET api/orders/my/5  ← أوردر معين للكاستومر الحالي
    [HttpGet("my/{id}")]
    public async Task<IActionResult> GetMyOrder(int id)
    {
        var order = await _orderService.GetByIdAsync(id, GetCustomerId());
        if (order == null)
            return NotFound(new { message = "Order not found." });

        return Ok(order);
    }

    // GET api/orders  ← كل الأوردرات (Admin)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orders = await _orderService.GetAllAsync();
        return Ok(orders);
    }

    // POST api/orders  ← إنشاء أوردر جديد
    [HttpPost]
    public async Task<IActionResult> Create(OrderCreateDto dto)
    {
        if (!dto.Items.Any())
            return BadRequest(new { message = "Order must have at least one item." });

        var (order, error) = await _orderService.CreateAsync(GetCustomerId(), dto);

        if (error != null)
            return BadRequest(new { message = error });

        return CreatedAtAction(nameof(GetMyOrder), new { id = order!.OrderId }, order);
    }

    // PATCH api/orders/5/status  ← تغيير الستاتس (Admin)
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, OrderStatusUpdateDto dto)
    {
        var updated = await _orderService.UpdateStatusAsync(id, dto);
        if (updated == null)
            return BadRequest(new { message = "Invalid order or status." });

        return Ok(updated);
    }

    // POST api/orders/5/cancel  ← كنسلة الأوردر
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var (success, error) = await _orderService.CancelAsync(id, GetCustomerId());
        if (!success)
            return BadRequest(new { message = error });

        return Ok(new { message = "Order cancelled successfully." });
    }
}