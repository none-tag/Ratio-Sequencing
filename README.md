# Cut Ratio Sequencer

A web-based garment production planning tool that automates the **Cut Ratio Sequencing** workflow for garment manufacturing. This application reads CSBD (Color-Size-Country Breakdown) Excel files, applies a greedy sequencing algorithm to optimize marker cutting order, and exports detailed cut plans.

## Features

- **Excel File Upload**: Drag & drop or browse to upload CSBD files
- **Automatic Parsing**: Extracts order data, marker information, and ShapeShifter inputs
- **Ratio Sequencing Algorithm**: Implements the 5-step greedy algorithm:
  1. Calculate pieces covered by each marker (Ply × Ratio)
  2. Compute size-wise coverage percentage (capped at 100%)
  3. Respect marker usage limits ("Can Be Used" constraint)
  4. Average coverage percentages per marker
  5. Select marker with highest coverage, repeat until fulfilled
- **Group Processing**: Handles General, China, and US country groups independently
- **Overcut Minimization**: Optimizes to reduce total overcut quantity
- **Visual Results**: Interactive tables with cut sequences, balance tracking, and charts
- **Excel Export**: Download complete results including CAD cut plans

## Live Demo

[View Live Demo](https://yourusername.github.io/cut-ratio-sequencer)

## Installation & Usage

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cut-ratio-sequencer.git
cd cut-ratio-sequencer
```

2. Serve with any static server:
```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser

### GitHub Pages Deployment

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/cut-ratio-sequencer.git
git push -u origin main
```

2. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Click Save

3. Your site will be live at `https://yourusername.github.io/cut-ratio-sequencer`

## File Structure

```
cut-ratio-sequencer/
├── index.html              # Main application
├── css/
│   └── style.css          # Stylesheet
├── js/
│   ├── countryGroups.js   # Country-to-group mapping
│   ├── parser.js          # Excel parsing logic
│   ├── sequencer.js       # Core sequencing algorithm
│   ├── exporter.js        # Excel export functionality
│   └── app.js             # Application controller
├── README.md              # This file
└── LICENSE                # MIT License
```

## Input Format

The application expects Excel files with these sheets:

### CSBD Sheet
- **Header row** containing: PACK TYPE, PACK NAME, GARMENTS COLOR, ACTUAL SHIP DATE, WEEK NO, SHIP DAY, COUNTRY NAME, SHIPMENT MODE, sizes (50-104), TOTAL
- **Data rows**: One per country shipment with size-wise quantities

### Marker Information Sheet (Optional)
- **Header row**: Marker, sizes (50-104), Ply, Can Be Used, Country Group
- **Data rows**: Marker definitions with size ratios

### ShapeShifter Input Sheet (Optional)
- Style, fabric, PO, buyer, color, and order quantities per size

## Algorithm Details

The sequencing algorithm works as follows:

1. **Aggregate** order quantities by country group (General, China, US)
2. **Apply extra percentage** (default 2%) to create target quantities
3. **For each cut iteration**:
   - Calculate how many pieces each marker would produce per size
   - Compute coverage % = pieces / remaining order (capped at 100%)
   - Set coverage to 0 if marker usage limit reached
   - Average coverage across all sizes
   - Select marker with highest average coverage
   - Apply cut and update remaining quantities
4. **Repeat** until all sizes are fulfilled or no marker can contribute

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires modern JavaScript (ES6+) and File API support.

## Dependencies

- [SheetJS](https://sheetjs.com/) - Excel read/write (CDN)
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - File download (CDN)

No build step or npm installation required.

## Customization

### Country Groups
Edit `js/countryGroups.js` to modify country-to-group mappings:

```javascript
const CountryGroups = {
    "CN": "China",
    "OB": "China",
    // Add or modify mappings
};
```

### Default Markers
If no Marker Information sheet is found, default markers from the Excel file are used. Edit `getDefaultMarkers()` in `js/parser.js` to change these.

### Styling
Modify `css/style.css` to customize the appearance. CSS variables are defined in `:root` for easy theming.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues or questions, please open a GitHub issue.

---

**Built for garment production planning automation.**
