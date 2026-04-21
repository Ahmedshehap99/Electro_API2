namespace ElectroAPI.DTOs
{
    public class RegisterDto
    {

        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public string? ShippingAddress { get; set; }
    }
}
