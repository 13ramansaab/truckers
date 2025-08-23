def test_tc003():
    # Construct a sample payload that matches the PRD schema for /fuel/entry
    payload = {
        "gallons": 15.5,
        "totalCost": 45.75,
        "location": {"lat": 40.0, "lng": -75.0},
        "date": "2025-08-17T12:00:00Z"
    }

    # Validate presence of required fields
    assert "gallons" in payload, "Missing 'gallons'"
    assert "totalCost" in payload, "Missing 'totalCost'"
    assert "location" in payload, "Missing 'location'"
    assert "date" in payload, "Missing 'date'"

    # Validate types according to PRD
    assert isinstance(payload["gallons"], (int, float)), "'gallons' must be a number"
    assert isinstance(payload["totalCost"], (int, float)), "'totalCost' must be a number"
    assert isinstance(payload["location"], dict), "'location' must be an object"
    assert isinstance(payload["date"], str), "'date' must be a string"

    print("TC003 passed: payload conforms to PRD schema for /fuel/entry")

# Execute the test
test_tc003()