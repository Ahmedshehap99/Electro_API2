using ElectroAPI.DTOs;
using ElectroAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElectroAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var token = await _authService.RegisterAsync(dto);

        if (token == null)
            return BadRequest(new { message = "Email already exists." });

        return Ok(new { token });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var token = await _authService.LoginAsync(dto);

        if (token == null)
            return Unauthorized(new { message = "Invalid email or password." });

        return Ok(new { token });
    }
}