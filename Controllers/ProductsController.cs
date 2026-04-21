using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductService _productService;

    public ProductsController(ProductService productService)
    {
        _productService = productService;
    }

    // GET api/products?search=phone&categoryId=1&minPrice=100&maxPrice=5000
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice)
    {
        var products = await _productService.GetAllAsync(search, categoryId, minPrice, maxPrice);
        return Ok(products);
    }

    // GET api/products/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null)
            return NotFound(new { message = "Product not found." });

        return Ok(product);
    }

    // POST api/products  [Admin فقط]
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(ProductCreateDto dto)
    {
        var created = await _productService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.ProductId }, created);
    }

    // PUT api/products/5  [Admin فقط]
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, ProductUpdateDto dto)
    {
        var updated = await _productService.UpdateAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = "Product not found." });

        return Ok(updated);
    }

    // DELETE api/products/5  [Admin فقط]
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _productService.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = "Product not found." });

        return Ok(new { message = "Product deleted successfully." });
    }
}
