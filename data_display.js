// File: `data_display.js`
/**
 * DataDisplay Class
 * Manages the creation, updating, and visibility of the real-time data display panel.
 * The table structure is dynamically generated based on provided field definitions.
 */
class DataDisplay {
    constructor(containerId, displayFieldsConfig) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`DataDisplay: Container element with ID '${containerId}' not found.`);
            return;
        }

        this.elements = {}; // To store references to internal span elements for updating
        this.displayFieldsConfig = displayFieldsConfig; // Store the configuration for fields
        this.panel = null; // Reference to the main data display panel div

        this._createPanel(); // Create and append the panel structure
        this.hide(); // Initially hide the panel
    }

    /**
     * Dynamically creates the HTML structure for the data display panel
     * and appends it to the specified container.
     */
    _createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'dataDisplayPanel';
        // Note: The main styles for #dataDisplayPanel are in data_display.css

        const table = document.createElement('table');
        // Note: Table specific styles are in data_display.css

        this.displayFieldsConfig.forEach(field => {
            const tr = document.createElement('tr');

            const tdLabel = document.createElement('td');
            tdLabel.textContent = field.label; // e.g., "时间 (t):"

            const tdValue = document.createElement('td');
            const spanValue = document.createElement('span');

            // Apply color class if defined
            if (field.className) {
                spanValue.classList.add(field.className);
            }
            spanValue.textContent = field.initialValue || ''; // Set initial value from config

            // Store reference to the span element for later updates
            this.elements[field.key] = spanValue;

            tdValue.appendChild(spanValue);
            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            table.appendChild(tr);
        });

        this.panel.appendChild(table);
        this.container.appendChild(this.panel);
    }

    /**
     * Updates the displayed values in the panel based on the provided data.
     * The method expects 'data' object keys to match 'key' in displayFieldsConfig.
     * @param {object} data - An object containing the data to display.
     *   Example: { time: 10.5, vx: 2.3, ... }
     */
    update(data) {
        if (!this.panel || !this.isVisible) { // Only update if panel exists and is visible
            return;
        }

        // Iterate through the field configurations to update corresponding elements
        this.displayFieldsConfig.forEach(field => {
            const element = this.elements[field.key];
            if (element) {
                let value = data[field.key];
                let formattedValue;

                // Apply specific formatting based on the key
                switch (field.key) {
                    case 'time':
                        formattedValue = value.toFixed(1) + ' s';
                        break;
                    case 'vx':
                    case 'vy':
                    case 'v':
                        formattedValue = value.toFixed(2) + ' m/s';
                        break;
                    case 'height':
                    case 'distance':
                        // Ensure height/distance are not negative for display
                        formattedValue = Math.max(0, value).toFixed(2) + ' m';
                        break;
                    case 'gravity':
                        formattedValue = value.toFixed(2) + ' m/s²';
                        break;
                    default:
                        formattedValue = value !== undefined ? String(value) : '';
                }
                element.textContent = formattedValue;
            }
        });
    }

    /**
     * Shows the data display panel.
     */
    show() {
        if (this.panel) {
            this.panel.classList.remove('hidden');
            this.isVisible = true;
        }
    }

    /**
     * Hides the data display panel.
     */
    hide() {
        if (this.panel) {
            this.panel.classList.add('hidden');
            this.isVisible = false;
        }
    }
}

export default DataDisplay; // Export the class