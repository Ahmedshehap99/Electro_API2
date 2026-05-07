using ElectroAPI.Data;
using ElectroAPI.DTOs;
using ElectroAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ElectroAPI.Services;

public class AuthService
{
    private readonly ElectroDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(ElectroDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    // REGISTER
    public async Task<string?> RegisterAsync(RegisterDto dto)
    {
        bool emailExists = await _context.Customers
            .AnyAsync(c => c.Email == dto.Email);

        if (emailExists) return null;

        int nextId = await _context.Customers.AnyAsync()
            ? await _context.Customers.MaxAsync(c => c.CustomerId) + 1
            : 1;

        var customer = new Customer
        {
            CustomerId = nextId,
            FullName = dto.FullName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            ShippingAddress = dto.ShippingAddress,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RegistrationDate = DateTime.UtcNow,
            IsAdmin = dto.IsAdmin   // ← جديد
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return GenerateToken(customer);
    }

    // LOGIN
    public async Task<string?> LoginAsync(LoginDto dto)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Email == dto.Email);

        if (customer == null) return null;

        bool isValid = BCrypt.Net.BCrypt.Verify(dto.Password, customer.PasswordHash);
        if (!isValid) return null;

        return GenerateToken(customer);
    }

    // GENERATE TOKEN
    private string GenerateToken(Customer customer)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, customer.CustomerId.ToString()),
            new Claim(ClaimTypes.Email, customer.Email),
            new Claim(ClaimTypes.Name, customer.FullName),
            new Claim("IsAdmin", customer.IsAdmin.ToString())  // ← جديد
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(double.Parse(_config["Jwt:ExpireDays"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}