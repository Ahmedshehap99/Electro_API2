using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace ElectroAPI.Services;

public class ProductService
{
    private readonly ElectroDbContext _context;

    public ProductService(ElectroDbContext context)
    {
        _context = context;
    }

    // GET ALL - مع فلترة وبحث
    public async Task<List<ProductResponseDto>> GetAllAsync(
        string? search, int? categoryId, decimal? minPrice, decimal? maxPrice)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Name.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId);

        if (minPrice.HasValue)
            query = query.Where(p => p.UnitPrice >= minPrice);

        if (maxPrice.HasValue)
            query = query.Where(p => p.UnitPrice <= maxPrice);

        return await query.Select(p => new ProductResponseDto
        {
            ProductId = p.ProductId,
            Name = p.Name,
            Description = p.Description,
            StockQuantity = p.StockQuantity ?? 0,
            UnitPrice = p.UnitPrice ?? 0,
            AddedDate = p.AddedDate.HasValue ? p.AddedDate.Value.ToDateTime(TimeOnly.MinValue) : null,
            CategoryName = p.Category != null ? p.Category.Name : null
        }).ToListAsync();
    }

    // GET BY ID
    public async Task<ProductResponseDto?> GetByIdAsync(int id)
    {
        var p = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.ProductId == id);

        if (p == null) return null;

        return new ProductResponseDto
        {
            ProductId = p.ProductId,
            Name = p.Name,
            Description = p.Description,
            StockQuantity = p.StockQuantity ?? 0,
            UnitPrice = p.UnitPrice ?? 0,
            AddedDate = p.AddedDate.HasValue ? p.AddedDate.Value.ToDateTime(TimeOnly.MinValue) : null,
            CategoryName = p.Category?.Name
        };
    }

    // CREATE
    public async Task<ProductResponseDto> CreateAsync(ProductCreateDto dto)
    {
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
            AddedDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(product.ProductId) ?? new ProductResponseDto();
    }

    // UPDATE
    public async Task<ProductResponseDto?> UpdateAsync(int id, ProductUpdateDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return null;

        if (dto.Name != null) product.Name = dto.Name;
        if (dto.Description != null) product.Description = dto.Description;
        if (dto.StockQuantity.HasValue) product.StockQuantity = dto.StockQuantity;
        if (dto.UnitPrice.HasValue) product.UnitPrice = dto.UnitPrice;
        if (dto.CategoryId.HasValue) product.CategoryId = dto.CategoryId;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    // DELETE
    public async Task<bool> DeleteAsync(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return false;

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return true;
    }
}