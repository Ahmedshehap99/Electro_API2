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

    // ══════════════════════════
    // STATS
    // ══════════════════════════
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        if (!IsAdmin()) return Forbid();
        var stats = await _adminService.GetStatsAsync();
        return Ok(stats);
    }

    // ══════════════════════════
    // CUSTOMERS
    // ══════════════════════════
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers()
    {
        if (!IsAdmin()) return Forbid();
        var customers = await _adminService.GetAllCustomersAsync();
        return Ok(customers);
    }

    [HttpDelete("customers/{id}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        if (!IsAdmin()) return Forbid();
        var deleted = await _adminService.DeleteCustomerAsync(id);
        if (!deleted)
            return NotFound(new { message = "Customer not found." });
        return Ok(new { message = "Customer deleted." });
    }

    // ══════════════════════════
    // PRODUCTS
    // ══════════════════════════
    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct(ProductCreateDto dto)
    {
        if (!IsAdmin()) return Forbid();
        var (product, error) = await _adminService.AdminCreateProductAsync(dto);
        if (error != null) return BadRequest(new { message = error });
        return Ok(product);
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProduct(int id, AdminUpdateProductDto dto)
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
        if (!deleted)
            return NotFound(new { message = "Product not found." });
        return Ok(new { message = "Product deleted." });
    }

    // ══════════════════════════
    // ORDERS
    // ══════════════════════════
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders()
    {
        if (!IsAdmin()) return Forbid();
        var orders = await _adminService.GetAllOrdersAsync();
        return Ok(orders);
    }

    [HttpPatch("orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, OrderStatusUpdateDto dto)
    {
        if (!IsAdmin()) return Forbid();
        var (order, error) = await _adminService.UpdateOrderStatusAsync(id, dto);
        if (error != null) return BadRequest(new { message = error });
        return Ok(order);
    }

    // ══════════════════════════
    // CATEGORIES
    // ══════════════════════════
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        if (!IsAdmin()) return Forbid();
        var cats = await _adminService.GetAllCategoriesAsync();
        return Ok(cats);
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(CategoryCreateDto dto)
    {
        if (!IsAdmin()) return Forbid();
        var cat = await _adminService.CreateCategoryAsync(dto);
        return Ok(cat);
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        if (!IsAdmin()) return Forbid();
        var deleted = await _adminService.DeleteCategoryAsync(id);
        if (!deleted)
            return BadRequest(new { message = "Category not found or has products." });
        return Ok(new { message = "Category deleted." });
    }
}