#nullable enable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace ElectroAPI.Models;

public partial class Category
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int? MainCategory { get; set; }

    [NotMapped]
    public virtual Category? MainCategoryNavigation { get; set; }

    [NotMapped]
    public virtual ICollection<Category> InverseMainCategoryNavigation { get; set; } = new List<Category>();

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}