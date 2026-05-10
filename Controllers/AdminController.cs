using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AdminService _adminService;

    public AdminController(AdminService adminService)
    {
        _adminService = adminService;
    }

    private bool IsAdmin() =>
        User.FindFirstValue("IsAdmin") == "True";

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        if (!IsAdmin()) return Forbid();
        return Ok(await _adminService.GetStatsAsync());
    }

    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers()
    {
        if (!IsAdmin()) return Forbid();
        return Ok(await _adminService.GetAllCustomersAsync());
    }

    [HttpDelete("customers/{id}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        if (!IsAdmin()) return Forbid();
        var deleted = await _adminService.DeleteCustomerAsync(id);
        if (!deleted) return NotFound(new { message = "Customer not found." });
        return Ok(new { message = "Customer deleted." });
    }

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct([FromBody] ProductCreateDto dto)
    {
        if (!IsAdmin()) return Forbid();
        var (product, error) = await _adminService.AdminCreateProductAsync(dto);
        if (error != null) return BadRequest(new { message = error });
        return Ok(product);
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] AdminUpdateProductDto dto)
    {
        if (!IsAdmin()) return Forbid();
        var (product, error) = await _adminService.AdminUpdateProductAsync(id, dto);
        if (error != null) return BadRequest(new { message = error });
        return Ok(product);
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        if (!IsAdmin()) return Forbid();
        var deleted = await _adminService.AdminDeleteProductAsync(id);
        if (!deleted) return NotFound(new { message = "Product not found." });
        return Ok(new { message = "Product deleted." });
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders()
    {
        if (!IsAdmin()) return Forbid();
        return Ok(await _adminService.GetAllOrdersAsync());
    }

    [HttpPatch("orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] OrderStatusUpdateDto dto)
    {
        if (!IsAdmin()) return Forbid();
        var (order, error) = await _adminService.UpdateOrderStatusAsync(id, dto);
        if (error != null) return BadRequest(new { message = error });
        return Ok(order);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        if (!IsAdmin()) return Forbid();
        return Ok(await _adminService.GetAllCategoriesAsync());
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryCreateDto dto)
    {
        if (!IsAdmin()) return Forbid();
        return Ok(await _adminService.CreateCategoryAsync(dto));
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        if (!IsAdmin()) return Forbid();
        var deleted = await _adminService.DeleteCategoryAsync(id);
        if (!deleted) return BadRequest(new { message = "Category not found or has products." });
        return Ok(new { message = "Category deleted." });
    }
}