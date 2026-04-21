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

    // ===========================
    // REGISTER
    // ===========================
    public async Task<string?> RegisterAsync(RegisterDto dto)
    {
        // 1. Check if email is already used by another customer
        bool emailExists = await _context.Customers
            .AnyAsync(c => c.Email == dto.Email);

        if (emailExists)
            return null; // Return null so the Controller sends back 400 Bad Request

        // 2. Generate next ID manually (because the DB has no IDENTITY on this column)
        int nextId = await _context.Customers.AnyAsync()
            ? await _context.Customers.MaxAsync(c => c.CustomerId) + 1
            : 1;

        // 3. Create the new customer object
        var customer = new Customer
        {
            CustomerId = nextId,
            FullName = dto.FullName,
            Email = dto.Email,
            PhoneNumber = dto.PhoneNumber,
            ShippingAddress = dto.ShippingAddress,
            // Never store plain text passwords — BCrypt hashes it securely
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RegistrationDate = DateTime.UtcNow
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        // 4. Return a JWT token immediately after successful registration
        return GenerateToken(customer);
    }

    // ===========================
    // LOGIN
    // ===========================
    public async Task<string?> LoginAsync(LoginDto dto)
    {
        // 1. Find the customer by email
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Email == dto.Email);

        // 2. If not found, return null
        if (customer == null)
            return null;

        // 3. Compare the entered password against the stored hash
        bool isValidPassword = BCrypt.Net.BCrypt.Verify(dto.Password, customer.PasswordHash);
        if (!isValidPassword)
            return null;

        // 4. Return JWT token on success
        return GenerateToken(customer);
    }

    // ===========================
    // GENERATE JWT TOKEN
    // ===========================
    private string GenerateToken(Customer customer)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Claims are pieces of data embedded inside the token
        // We use them later in Controllers to know who is making the request
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, customer.CustomerId.ToString()),
            new Claim(ClaimTypes.Email, customer.Email),
            new Claim(ClaimTypes.Name, customer.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(
                double.Parse(_config["Jwt:ExpireDays"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}