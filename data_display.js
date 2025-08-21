// File: `data_display.js`
/**
 * DataDisplay Class
 * Manages the creation and updating of the real-time data display table.
 * The table structure is dynamically generated based on provided field definitions.
 * It's purely concerned with the table content, not its positioning or visibility (which is handled externally).
 */
class DataDisplay {
    /**
     * @param {HTMLElement} containerElement - The DOM element where the data table will be appended.
     * @param {Array<Object>} displayFieldsConfig - An array of objects defining the data fields.
     *   Each object should have:
     *     - key: (string) The key to look up in the data object for updating.
     *     - label: (string) The text label to display in the table.
     *     - className: (string, optional) A CSS class to apply to the value span.
     *     - initialValue: (string, optional) The initial text content for the value span.
     */
    constructor(containerElement, displayFieldsConfig) {
        this.container = containerElement;
        if (!this.container) {
            console.error("DataDisplay: Container element not provided or not found.");
            return;
        }

        this.elements = {}; // To store references to internal span elements for updating
        this.displayFieldsConfig = displayFieldsConfig; // Store the configuration for fields

        this._createTable(); // Create and append the table structure to the container
    }

    /**
     * Dynamically creates the HTML <table> structure for the data display
     * and appends it to the specified container.
     */
    _createTable() {
        // Clear existing content in the container, just in case
        this.container.innerHTML = '';

        const table = document.createElement('table');
        table.classList.add('data-display-table'); // Apply a class for internal table styling

        this.displayFieldsConfig.forEach(field => {
            const tr = document.createElement('tr');

            const tdLabel = document.createElement('td');
            tdLabel.textContent = field.label; // e.g., "时间 (t):"

            const tdValue = document.createElement('td');
            const spanValue = document.createElement('span');

            // Apply color class if defined (these classes are assumed to be global or in main CSS)
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

        this.container.appendChild(table);
    }

    /**
     * Updates the displayed values in the panel based on the provided data.
     * The method expects 'data' object keys to match 'key' in displayFieldsConfig.
     * IMPORTANT: The 'data' object passed to this method should already contain
     *            formatted string values, including units and desired precision.
     * @param {object} data - An object containing the data to display.
     *   Example: { time: "10.5 s", vx: "2.30 m/s", ... }
     */
    update(data) {
        // Only update if elements are initialized. Visibility is managed by the main script.
        if (Object.keys(this.elements).length === 0) {
            console.warn("DataDisplay: Elements not initialized, cannot update.");
            return;
        }

        // Iterate through the field configurations to update corresponding elements
        this.displayFieldsConfig.forEach(field => {
            const element = this.elements[field.key];
            if (element) {
                // The value received from 'data' is now expected to be a pre-formatted string.
                const valueToDisplay = data[field.key];
                element.textContent = valueToDisplay !== undefined ? String(valueToDisplay) : '';
            }
        });
    }

    // show() and hide() methods are REMOVED as per the user's request.
    // The main script will manage the visibility of the dataDisplayContainer element itself.
}

export default DataDisplay; // Export the class