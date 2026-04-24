using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly CartService _cartService;

    public CartController(CartService cartService)
    {
        _cartService = cartService;
    }

    private int GetCustomerId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET api/cart
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var cart = await _cartService.GetCartAsync(GetCustomerId());
        return Ok(cart);
    }

    // POST api/cart
    [HttpPost]
    public async Task<IActionResult> AddToCart(CartAddDto dto)
    {
        var (item, error) = await _cartService.AddToCartAsync(GetCustomerId(), dto);
        if (error != null)
            return BadRequest(new { message = error });

        return Ok(item);
    }

    // PUT api/cart/5
    [HttpPut("{cartId}")]
    public async Task<IActionResult> UpdateQuantity(int cartId, CartUpdateDto dto)
    {
        var (item, error) = await _cartService.UpdateQuantityAsync(
            cartId, GetCustomerId(), dto);

        if (error != null)
            return BadRequest(new { message = error });

        return Ok(item);
    }

    // DELETE api/cart/5
    [HttpDelete("{cartId}")]
    public async Task<IActionResult> RemoveItem(int cartId)
    {
        var removed = await _cartService.RemoveItemAsync(cartId, GetCustomerId());
        if (!removed)
            return NotFound(new { message = "Cart item not found." });

        return Ok(new { message = "Item removed from cart." });
    }

    // DELETE api/cart
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var cleared = await _cartService.ClearCartAsync(GetCustomerId());
        if (!cleared)
            return BadRequest(new { message = "Cart is already empty." });

        return Ok(new { message = "Cart cleared successfully." });
    }

    // POST api/cart/checkout
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromQuery] string? shippingAddress)
    {
        var (order, error) = await _cartService.CheckoutAsync(
            GetCustomerId(), shippingAddress);

        if (error != null)
            return BadRequest(new { message = error });

        return Ok(order);
    }
}