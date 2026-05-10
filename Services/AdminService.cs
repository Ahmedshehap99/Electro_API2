using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ElectroAPI.Services;

public class AdminService
{
    private readonly ElectroDbContext _context;

    public AdminService(ElectroDbContext context)
    {
        _context = context;
    }

    // ══════════════════════════
    // STATS
    // ══════════════════════════
    public async Task<object> GetStatsAsync()
    {
        var totalCustomers = await _context.Customers
            .CountAsync(c => c.IsAdmin == false || c.IsAdmin == null);

        var totalProducts = await _context.Products.CountAsync();
        var totalOrders = await _context.Orders.CountAsync();
        var totalRevenue = await _context.Orders
            .Where(o => o.Status != "Cancelled")
            .SumAsync(o => o.TotalAmount ?? 0);
        var pendingOrders = await _context.Orders
            .CountAsync(o => o.Status == "Pending");
        var lowStockProducts = await _context.Products
            .CountAsync(p => p.StockQuantity <= 5);

        return new
        {
            totalCustomers,
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingOrders,
            lowStockProducts
        };
    }
    // ══════════════════════════
    // CUSTOMERS
    // ══════════════════════════
    public async Task<List<object>> GetAllCustomersAsync()
    {
        return await _context.Customers
            .Select(c => (object)new
            {
                c.CustomerId,
                c.FullName,
                c.Email,
                c.PhoneNumber,
                c.ShippingAddress,
                c.RegistrationDate,
                IsAdmin = c.IsAdmin ?? false,
                TotalOrders = c.Orders.Count,
                TotalSpent = c.Orders
                    .Where(o => o.Status != "Cancelled")
                    .Sum(o => o.TotalAmount ?? 0)
            }).ToListAsync();
    }

    public async Task<bool> DeleteCustomerAsync(int customerId)
    {
        var customer = await _context.Customers.FindAsync(customerId);
        if (customer == null) return false;
        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return true;
    }

    // ══════════════════════════
    // PRODUCTS
    // ══════════════════════════
    public async Task<(ProductResponseDto? product, string? error)> AdminCreateProductAsync(
     ProductCreateDto dto)
    {
        // استخدم Where بدل FindAsync عشان نتجنب الـ cast error
        var categoryExists = await _context.Categories
            .Where(c => c.CategoryId == dto.CategoryId)
            .Select(c => new { c.CategoryId, c.Name })
            .FirstOrDefaultAsync();

        if (categoryExists == null)
            return (null, $"Category with ID {dto.CategoryId} not found.");

        int nextId = await _context.Products.AnyAsync()
            ? await _context.Products.MaxAsync(p => p.ProductId) + 1
            : 1;

        var product = new Product
        {
            ProductId = nextId,
            Name = dto.Name,
            Description = dto.Description,
            StockQuantity = dto.StockQuantity,
            UnitPrice = dto.UnitPrice,
            CategoryId = dto.CategoryId,
            ImageUrl = dto.ImageUrl,
            AddedDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // ارجع الـ data مباشرة بدون query تانية
        return (new ProductResponseDto
        {
            ProductId = product.ProductId,
            Name = product.Name,
            Description = product.Description,
            StockQuantity = product.StockQuantity ?? 0,
            UnitPrice = product.UnitPrice ?? 0,
            CategoryId = product.CategoryId,
            CategoryName = categoryExists.Name,
            ImageUrl = product.ImageUrl,
            AddedDate = DateTime.UtcNow
        }, null);
    }
    public async Task<(ProductResponseDto? product, string? error)> AdminUpdateProductAsync(
        int productId, AdminUpdateProductDto dto)
    {
        var product = await _context.Products
            .Where(p => p.ProductId == productId)
            .FirstOrDefaultAsync();

        if (product == null) return (null, "Product not found.");

        if (dto.Name != null) product.Name = dto.Name;
        if (dto.Description != null) product.Description = dto.Description;
        if (dto.StockQuantity.HasValue) product.StockQuantity = dto.StockQuantity.Value;
        if (dto.UnitPrice.HasValue) product.UnitPrice = dto.UnitPrice.Value;
        if (dto.CategoryId.HasValue) product.CategoryId = dto.CategoryId.Value;
        if (dto.ImageUrl != null) product.ImageUrl = dto.ImageUrl;

        await _context.SaveChangesAsync();

        // ارجع الـ data مباشرة
        return (new ProductResponseDto
        {
            ProductId = product.ProductId,
            Name = product.Name,
            Description = product.Description,
            StockQuantity = product.StockQuantity ?? 0,
            UnitPrice = product.UnitPrice ?? 0,
            CategoryId = product.CategoryId,
            ImageUrl = product.ImageUrl,
            AddedDate = product.AddedDate.HasValue
                ? product.AddedDate.Value.ToDateTime(TimeOnly.MinValue)
                : null
        }, null);
    }
    public async Task<bool> AdminDeleteProductAsync(int productId)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null) return false;
        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return true;
    }

    // ══════════════════════════
    // ORDERS
    // ══════════════════════════
    public async Task<List<object>> GetAllOrdersAsync()
    {
        return await _context.Orders
            .Select(o => (object)new
            {
                o.OrderId,
                o.Status,
                o.TotalAmount,
                o.OrderDate,
                CustomerId = o.CustomerId ?? 0,
                CustomerName = o.Customer != null ? o.Customer.FullName : "",
                CustomerEmail = o.Customer != null ? o.Customer.Email : "",
                ItemsCount = o.OrderItems.Count,
                Items = o.OrderItems.Select(oi => new
                {
                    oi.ProductId,
                    ProductName = oi.Product != null ? oi.Product.Name : "",
                    oi.Quantity,
                    oi.UnitPrice
                }).ToList()
            }).ToListAsync();
    }

    public async Task<(object? order, string? error)> UpdateOrderStatusAsync(
        int orderId, OrderStatusUpdateDto dto)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order == null) return (null, "Order not found.");

        var validStatuses = new[] { "Pending", "Processing", "Shipped", "Delivered", "Cancelled" };
        if (!validStatuses.Contains(dto.Status))
            return (null, "Invalid status. Use: Pending / Processing / Shipped / Delivered / Cancelled");

        if (dto.Status == "Cancelled" && order.Status != "Cancelled")
        {
            var items = await _context.OrderItems
                .Where(i => i.OrderId == orderId)
                .ToListAsync();

            foreach (var item in items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                    product.StockQuantity += item.Quantity;
            }
        }

        order.Status = dto.Status;
        await _context.SaveChangesAsync();

        return (new
        {
            order.OrderId,
            order.Status,
            order.TotalAmount
        }, null);
    }

    // ══════════════════════════
    // CATEGORIES
    // ══════════════════════════
    public async Task<List<object>> GetAllCategoriesAsync()
    {
        return await _context.Categories
            .Select(c => (object)new
            {
                c.CategoryId,
                c.Name,
                c.Description,
                ProductCount = c.Products.Count
            }).ToListAsync();
    }

    public async Task<object> CreateCategoryAsync(CategoryCreateDto dto)
    {
        int nextId = await _context.Categories.AnyAsync()
            ? await _context.Categories.MaxAsync(c => c.CategoryId) + 1
            : 1;

        var category = new Category
        {
            CategoryId = nextId,
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return new { category.CategoryId, category.Name, category.Description };
    }

    public async Task<bool> DeleteCategoryAsync(int categoryId)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

        if (category == null) return false;
        if (category.Products.Any()) return false;

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }


}