using System.Text.RegularExpressions;

namespace Tracklab.Tests;

/// <summary>
/// Tests for the validation logic used by TrackersController and RequestsController.
/// These mirror the inline validation in the controllers.
/// </summary>
public class ValidationTests
{
    private static readonly string[] AllowedActionTypes = { "none", "text", "file", "date" };
    private static readonly Regex CodeRegex = new(@"^[A-Z0-9-]+$", RegexOptions.Compiled);

    // --- Tracker validations ---

    [Theory]
    [InlineData("TRK-01", true)]
    [InlineData("ABC123", true)]
    [InlineData("A-B-C", true)]
    [InlineData("", false)]
    [InlineData("trk-01", false)]       // lowercase
    [InlineData("TRK 01", false)]       // space
    [InlineData("TRK@01", false)]       // special char
    public void TrackerCode_Regex_ValidatesCorrectly(string code, bool expected)
    {
        var result = !string.IsNullOrEmpty(code) && CodeRegex.IsMatch(code);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("none", true)]
    [InlineData("text", true)]
    [InlineData("file", true)]
    [InlineData("date", true)]
    [InlineData("invalid", false)]
    [InlineData("FILE", false)]         // case-sensitive
    [InlineData("", false)]
    public void TrackerActionType_ValidatesCorrectly(string actionType, bool expected)
    {
        var result = AllowedActionTypes.Contains(actionType);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(-1, true)]    // Kalbe uses -1 for items without SLA
    [InlineData(0, true)]
    [InlineData(5, true)]
    [InlineData(-2, false)]
    [InlineData(-100, false)]
    public void TrackerMandays_MustBeAtLeastNeg1(int mandays, bool expected)
    {
        Assert.Equal(expected, mandays >= -1);
    }

    // --- Request validations ---

    [Theory]
    [InlineData(0, true)]
    [InlineData(100.50, true)]
    [InlineData(1500000, true)]
    [InlineData(-1, false)]
    [InlineData(-0.01, false)]
    public void RequestTotalFee_MustBeNonNegative(decimal fee, bool expected)
    {
        Assert.Equal(expected, fee >= 0);
    }

    [Fact]
    public void RequestDates_CompletedBeforeWip_IsInvalid()
    {
        var wip = new DateTime(2026, 6, 15);
        var completed = new DateTime(2026, 6, 10); // before WIP

        var valid = completed >= wip;
        Assert.False(valid);
    }

    [Fact]
    public void RequestDates_CompletedAfterWip_IsValid()
    {
        var wip = new DateTime(2026, 6, 15);
        var completed = new DateTime(2026, 6, 20);

        var valid = completed >= wip;
        Assert.True(valid);
    }

    [Fact]
    public void RequestDates_SameDay_IsValid()
    {
        var wip = new DateTime(2026, 6, 15);
        var completed = new DateTime(2026, 6, 15);
        Assert.True(completed >= wip);
    }

    [Fact]
    public void RequestDates_NullDates_AreValid()
    {
        // If either date is null, we skip the validation (both must be present)
        DateTime? wip = null;
        DateTime? completed = new DateTime(2026, 6, 20);

        var shouldValidate = wip.HasValue && completed.HasValue;
        var valid = !shouldValidate || completed >= wip;
        Assert.True(valid);
    }
}
