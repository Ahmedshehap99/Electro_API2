using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ElectroAPI.Services;

public class CartService
{
    private readonly ElectroDbContext _context;

    public CartService(ElectroDbContext context)
    {
        _context = context;
    }

    
    public async Task<CartSummaryDto> GetCartAsync(int customerId)
    {
        var items = await _context.Carts
            .Where(c => c.CustomerId == customerId)
            .Select(c => new CartResponseDto
            {
                CartId = c.CartId,
                ProductId = c.ProductId ?? 0,
                ProductName = c.Product != null ? c.Product.Name : "",
                UnitPrice = c.Product != null ? c.Product.UnitPrice ?? 0 : 0,
                Quantity = c.Quantity ?? 0,
                Subtotal = (c.Product != null ? c.Product.UnitPrice ?? 0 : 0)
                           * (c.Quantity ?? 0),
                AddedDate = c.AddedDate
            }).ToListAsync();

        return new CartSummaryDto
        {
            Items = items,
            TotalAmount = items.Sum(i => i.Subtotal),
            TotalItems = items.Sum(i => i.Quantity)
        };
    }

    // ADD TO CART - ضيف منتج للـ Cart
    public async Task<(CartResponseDto? item, string? error)> AddToCartAsync(
        int customerId, CartAddDto dto)
    {
        // تحقق إن المنتج موجود
        var product = await _context.Products.FindAsync(dto.ProductId);
        if (product == null)
            return (null, "Product not found.");

        // تحقق إن الـ Stock كافي
        if (product.StockQuantity < dto.Quantity)
            return (null, $"Not enough stock. Available: {product.StockQuantity}");

        // لو المنتج موجود في الـ Cart بالفعل زوّد الـ Quantity
        var existingItem = await _context.Carts
            .FirstOrDefaultAsync(c => c.CustomerId == customerId
                && c.ProductId == dto.ProductId);

        if (existingItem != null)
        {
            existingItem.Quantity += dto.Quantity;
            await _context.SaveChangesAsync();

            return (await GetCartItemAsync(existingItem.CartId), null);
        }

        // ضيف item جديد
        int nextId = await _context.Carts.AnyAsync()
            ? await _context.Carts.MaxAsync(c => c.CartId) + 1
            : 1;

        var cartItem = new Cart
        {
            CartId = nextId,
            CustomerId = customerId,
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            AddedDate = DateTime.UtcNow
        };

        _context.Carts.Add(cartItem);
        await _context.SaveChangesAsync();

        return (await GetCartItemAsync(cartItem.CartId), null);
    }

    // UPDATE QUANTITY - عدّل الكمية
    public async Task<(CartResponseDto? item, string? error)> UpdateQuantityAsync(
        int cartId, int customerId, CartUpdateDto dto)
    {
        var cartItem = await _context.Carts
            .FirstOrDefaultAsync(c => c.CartId == cartId
                && c.CustomerId == customerId);

        if (cartItem == null)
            return (null, "Cart item not found.");

        // تحقق إن الـ Stock كافي
        var product = await _context.Products.FindAsync(cartItem.ProductId);
        if (product != null && product.StockQuantity < dto.Quantity)
            return (null, $"Not enough stock. Available: {product.StockQuantity}");

        cartItem.Quantity = dto.Quantity;
        await _context.SaveChangesAsync();

        return (await GetCartItemAsync(cartId), null);
    }

    // REMOVE ITEM - شيل منتج من الـ Cart
    public async Task<bool> RemoveItemAsync(int cartId, int customerId)
    {
        var cartItem = await _context.Carts
            .FirstOrDefaultAsync(c => c.CartId == cartId
                && c.CustomerId == customerId);

        if (cartItem == null) return false;

        _context.Carts.Remove(cartItem);
        await _context.SaveChangesAsync();
        return true;
    }

    // CLEAR CART - امسح كل الـ Cart
    public async Task<bool> ClearCartAsync(int customerId)
    {
        var cartItems = await _context.Carts
            .Where(c => c.CustomerId == customerId)
            .ToListAsync();

        if (!cartItems.Any()) return false;

        _context.Carts.RemoveRange(cartItems);
        await _context.SaveChangesAsync();
        return true;
    }

    // CHECKOUT - حوّل الـ Cart لـ Order
    public async Task<(OrderResponseDto? order, string? error)> CheckoutAsync(
        int customerId, string? shippingAddress)
    {
        // جيب الـ Cart items
        var cartItems = await _context.Carts
            .Where(c => c.CustomerId == customerId)
            .Include(c => c.Product)
            .ToListAsync();

        if (!cartItems.Any())
            return (null, "Your cart is empty.");

        // تحقق من الـ Stock لكل المنتجات
        foreach (var item in cartItems)
        {
            if (item.Product == null)
                return (null, $"Product not found.");

            if (item.Product.StockQuantity < item.Quantity)
                return (null, $"Not enough stock for: {item.Product.Name}. Available: {item.Product.StockQuantity}");
        }

        // إنشاء الـ Order
        int nextOrderId = await _context.Orders.AnyAsync()
            ? await _context.Orders.MaxAsync(o => o.OrderId) + 1
            : 1;

        var order = new Order
        {
            OrderId = nextOrderId,
            CustomerId = customerId,
            Status = "Pending",
            OrderDate = DateTime.UtcNow,
            TotalAmount = 0
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // إضافة الـ OrderItems
        decimal total = 0;
        int nextItemId = await _context.OrderItems.AnyAsync()
            ? await _context.OrderItems.MaxAsync(i => i.OrderItemId) + 1
            : 1;

        foreach (var item in cartItems)
        {
            decimal price = item.Product!.UnitPrice ?? 0;

            var orderItem = new OrderItem
            {
                OrderItemId = nextItemId++,
                OrderId = order.OrderId,
                ProductId = item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = price
            };

            _context.OrderItems.Add(orderItem);

            // تقليل الـ Stock
            item.Product.StockQuantity -= item.Quantity;
            total += price * (item.Quantity ?? 0);
        }

        order.TotalAmount = total;
        await _context.SaveChangesAsync();

        // امسح الـ Cart بعد الـ Checkout
        _context.Carts.RemoveRange(cartItems);
        await _context.SaveChangesAsync();

        // رجّع الـ Order
        var orderResponse = await _context.Orders
            .Where(o => o.OrderId == order.OrderId)
            .Select(o => new OrderResponseDto
            {
                OrderId = o.OrderId,
                Status = o.Status ?? "Pending",
                TotalAmount = o.TotalAmount ?? 0,
                OrderDate = o.OrderDate ?? DateTime.UtcNow,
                CustomerId = o.CustomerId ?? 0,
                CustomerName = o.Customer != null ? o.Customer.FullName : "",
                Items = o.OrderItems.Select(oi => new OrderItemResponseDto
                {
                    ProductId = oi.ProductId ?? 0,
                    ProductName = oi.Product != null ? oi.Product.Name : "",
                    Quantity = oi.Quantity ?? 0,
                    UnitPrice = oi.UnitPrice ?? 0,
                    Subtotal = (oi.UnitPrice ?? 0) * (oi.Quantity ?? 0)
                }).ToList()
            })
            .FirstOrDefaultAsync();

        return (orderResponse, null);
    }

    // HELPER
    private async Task<CartResponseDto?> GetCartItemAsync(int cartId)
    {
        return await _context.Carts
            .Where(c => c.CartId == cartId)
            .Select(c => new CartResponseDto
            {
                CartId = c.CartId,
                ProductId = c.ProductId ?? 0,
                ProductName = c.Product != null ? c.Product.Name : "",
                UnitPrice = c.Product != null ? c.Product.UnitPrice ?? 0 : 0,
                Quantity = c.Quantity ?? 0,
                Subtotal = (c.Product != null ? c.Product.UnitPrice ?? 0 : 0)
                           * (c.Quantity ?? 0),
                AddedDate = c.AddedDate
            })
            .FirstOrDefaultAsync();
    }
}