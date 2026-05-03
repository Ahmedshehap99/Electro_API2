using Microsoft.AspNetCore.Mvc;

namespace ElectroAPI.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
