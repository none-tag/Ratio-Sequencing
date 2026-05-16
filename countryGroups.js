/**
 * Country Group Mapping
 * Static mapping of countries to their respective groups
 */

const CountryGroups = {
    // China Group
    "CN": "China",
    "OB": "China",

    // US Group
    "CA": "US",
    "CO": "US",
    "DR": "US",
    "EC": "US",
    "LD": "US",
    "MX": "US",
    "OU": "US",
    "US": "US",

    // General Group (all other countries)
    "AU": "General",
    "BE": "General",
    "BR": "General",
    "CH": "General",
    "CL": "General",
    "DE": "General",
    "DK": "General",
    "EN": "General",
    "FR": "General",
    "GB": "General",
    "HK": "General",
    "HR": "General",
    "ID": "General",
    "IN": "General",
    "IX": "General",
    "JP": "General",
    "KR": "General",
    "LH": "General",
    "ME": "General",
    "MY": "General",
    "NH": "General",
    "NZ": "General",
    "OD": "General",
    "OE": "General",
    "OF": "General",
    "OG": "General",
    "OI": "General",
    "OJ": "General",
    "OK": "General",
    "OL": "General",
    "OO": "General",
    "OT": "General",
    "PA": "General",
    "PE": "General",
    "PH": "General",
    "PL": "General",
    "PY": "General",
    "RS": "General",
    "SE": "General",
    "SV": "General",
    "SW": "General",
    "TH": "General",
    "TR": "General",
    "TW": "General",
    "UY": "General",
    "VN": "General",
    "WK": "General",
    "ZA": "General"
};

// Size columns in order
const SizeColumns = ["50", "56", "62", "68", "74", "80", "86", "92", "98", "104"];

// Get group for a country
function getCountryGroup(countryCode) {
    return CountryGroups[countryCode] || "General";
}

// Get all countries in a group
function getCountriesInGroup(group) {
    return Object.entries(CountryGroups)
        .filter(([_, g]) => g === group)
        .map(([country, _]) => country);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CountryGroups, SizeColumns, getCountryGroup, getCountriesInGroup };
}
