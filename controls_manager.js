// File: `controls_manager.js`
/**
 * ControlsManager Class
 * Dynamically generates and manages UI controls like sliders and buttons
 * from a configuration object. It handles element creation, event listening,
 * and value updates, notifying the main simulation via a callback.
 */
class ControlsManager {
    /**
     * @param {HTMLElement} containerElement - The DOM element where controls will be appended.
     * @param {Array<Object>} controlsConfig - An array of objects defining the UI controls.
     * @param {Function} onUpdate - Callback function executed when a control's value changes.
     *   It receives `(key, value)`.
     */
    constructor(containerElement, controlsConfig, onUpdate) {
        this.container = containerElement;
        this.config = controlsConfig;
        this.onUpdate = onUpdate;

        if (!this.container) {
            console.error("ControlsManager: Container element not provided or not found.");
            return;
        }

        this.elements = {}; // References to DOM elements (inputs, value spans)
        this.values = {};   // Internal state of control values

        this._createControls();
    }

    /**
     * Dynamically creates the HTML structure for the controls.
     */
    _createControls() {
        this.container.innerHTML = ''; // Clear existing content

        this.config.forEach(control => {
            const { type, key } = control;

            switch (type) {
                case 'title':
                    this._createTitle(control);
                    break;
                case 'slider':
                    this._createSlider(control);
                    break;
                case 'button':
                    this._createButton(control);
                    break;
                default:
                    console.warn(`ControlsManager: Unknown control type "${type}"`);
            }
        });
    }

    _createTitle(config) {
        const h3 = document.createElement('h3');
        h3.textContent = config.text;
        this.container.appendChild(h3);
    }

    _createSlider(config) {
        // UPDATED: Destructure the new `precision` property and provide a default.
        const { key, label, min, max, step, initialValue, unit = '', precision = 0 } = config;

        const row = document.createElement('div');
        row.className = 'control-row';

        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.htmlFor = `ctrl-input-${key}`;

        const inputEl = document.createElement('input');
        inputEl.type = 'range';
        inputEl.id = `ctrl-input-${key}`;
        inputEl.min = min;
        inputEl.max = max;
        inputEl.step = step;
        inputEl.value = initialValue;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'control-value';
        // UPDATED: Use `toFixed(precision)` for consistent initial display.
        valueSpan.textContent = `${parseFloat(initialValue).toFixed(precision)}${unit}`;

        // Store references and initial value
        this.elements[key] = { input: inputEl, valueSpan: valueSpan };
        this.values[key] = parseFloat(initialValue);

        // Add event listener
        inputEl.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            this.values[key] = newValue;

            // SIMPLIFIED & FIXED: Use the `precision` from config directly.
            // This replaces the old, complex ternary logic.
            valueSpan.textContent = `${newValue.toFixed(precision)}${unit}`;

            if (this.onUpdate) {
                this.onUpdate(key, newValue);
            }
        });

        row.appendChild(labelEl);
        row.appendChild(inputEl);
        row.appendChild(valueSpan);
        this.container.appendChild(row);
    }

    _createButton(config) {
        const { text, onClick } = config;
        const buttonEl = document.createElement('button');
        buttonEl.textContent = text;
        if (onClick && typeof onClick === 'function') {
            buttonEl.addEventListener('click', onClick);
        }
        this.container.appendChild(buttonEl);
    }

    /**
     * Gets the current value of a specific control.
     * @param {string} key - The key of the control.
     * @returns {number | undefined} The current value.
     */
    getValue(key) {
        return this.values[key];
    }
}

export default ControlsManager;