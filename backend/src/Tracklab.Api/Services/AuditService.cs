using Tracklab.Api.Data;

namespace Tracklab.Api.Services;

public class AuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task RecordAsync(
        string? user,
        string entity,
        string entityId,
        string action,
        string? oldValue = null,
        string? newValue = null,
        string? correlationId = null)
    {
        var trail = new AuditTrail
        {
            Timestamp = DateTime.UtcNow,
            User = user,
            Entity = entity,
            EntityId = entityId,
            Action = action,
            OldValue = oldValue,
            NewValue = newValue,
            CorrelationId = correlationId
        };

        _db.AuditTrails.Add(trail);
        await _db.SaveChangesAsync();
    }
}
