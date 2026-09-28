const API_BASE = "";


// ======================================================
// APPLICATION STATE
// ======================================================

let fields = [];

let machines = [];

let editingFieldId = null;

let editingMachineId = null;

const predictionCache = {};


// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeApplication();

    }
);


async function initializeApplication() {

    setupEventListeners();

    await checkAPI();

    await loadFields();

    await loadMachines();

}


// ======================================================
// EVENT LISTENERS
// ======================================================

function setupEventListeners() {

    const fieldType =
        document.getElementById(
            "fieldType"
        );

    if (fieldType) {

        fieldType.addEventListener(
            "change",
            handleFieldTypeChange
        );

    }


    const fieldForm =
        document.getElementById(
            "fieldForm"
        );

    if (fieldForm) {

        fieldForm.addEventListener(
            "submit",
            saveField
        );

    }


    const machineForm =
        document.getElementById(
            "machineForm"
        );

    if (machineForm) {

        machineForm.addEventListener(
            "submit",
            saveMachine
        );

    }


    const predictButton =
        document.getElementById(
            "predictButton"
        );

    if (predictButton) {

        predictButton.addEventListener(
            "click",
            runPrediction
        );

    }

}


// ======================================================
// API HEALTH
// ======================================================

async function checkAPI() {

    const status =
        document.getElementById(
            "apiStatus"
        );

    const dot =
        document.getElementById(
            "statusDot"
        );


    try {

        const response =
            await fetch(
                `${API_BASE}/health`
            );


        if (!response.ok) {

            throw new Error(
                "API unavailable"
            );

        }


        status.textContent =
            "API Online";


        dot.classList.add(
            "online"
        );


    } catch (error) {

        status.textContent =
            "API Offline";


        dot.classList.add(
            "offline"
        );


        showToast(
            "Backend API is not running",
            "error"
        );

    }

}


// ======================================================
// FIELD MANAGEMENT
// ======================================================

async function loadFields() {

    try {

        const response =
            await fetch(
                `${API_BASE}/fields/`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load fields"
            );

        }


        fields =
            await response.json();


        renderFields();

        renderMachineForm();


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function renderFields() {

    const tbody =
        document.getElementById(
            "fieldsTableBody"
        );


    const count =
        document.getElementById(
            "fieldCount"
        );


    count.textContent =
        fields.length;


    tbody.innerHTML = "";


    if (fields.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="5">

                    <div class="empty-state">

                        <div class="empty-icon">
                            ▦
                        </div>

                        <h3>
                            No fields configured
                        </h3>

                        <p>
                            Add your first machine field
                            to begin.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    fields.forEach(
        field => {

            const row =
                document.createElement(
                    "tr"
                );


            const options =
                field.dropdown_options
                    ? field.dropdown_options.join(
                        ", "
                    )
                    : "—";


            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeHTML(
                            field.field_name
                        )}
                    </strong>

                </td>


                <td>

                    <span class="type-badge">
                        ${escapeHTML(
                            field.field_type
                        )}
                    </span>

                </td>


                <td>

                    ${
                        field.required

                        ? `
                            <span
                                class="required-badge"
                            >
                                Required
                            </span>
                        `

                        : `
                            <span
                                class="optional-badge"
                            >
                                Optional
                            </span>
                        `
                    }

                </td>


                <td>
                    ${escapeHTML(options)}
                </td>


                <td>

                    <div
                        class="action-buttons"
                    >

                        <button
                            class="action-btn edit"
                            onclick="editField(${field.id})"
                        >
                            Edit
                        </button>


                        <button
                            class="action-btn delete"
                            onclick="deleteField(${field.id})"
                        >
                            Delete
                        </button>

                    </div>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


// ======================================================
// FIELD FORM
// ======================================================

function toggleFieldForm() {

    const container =
        document.getElementById(
            "fieldFormContainer"
        );


    const hidden =
        container.classList.contains(
            "hidden"
        );


    if (hidden) {

        container.classList.remove(
            "hidden"
        );


        document
            .getElementById(
                "fieldName"
            )
            .focus();

    } else {

        cancelFieldForm();

    }

}


function cancelFieldForm() {

    resetFieldForm();


    document
        .getElementById(
            "fieldFormContainer"
        )
        .classList.add(
            "hidden"
        );

}


function handleFieldTypeChange() {

    const type =
        document.getElementById(
            "fieldType"
        ).value;


    const optionsGroup =
        document.getElementById(
            "dropdownOptionsGroup"
        );


    if (type === "dropdown") {

        optionsGroup.classList.remove(
            "hidden"
        );

    } else {

        optionsGroup.classList.add(
            "hidden"
        );


        document
            .getElementById(
                "dropdownOptions"
            )
            .value = "";

    }

}


async function saveField(
    event
) {

    event.preventDefault();


    const fieldName =
        document
            .getElementById(
                "fieldName"
            )
            .value
            .trim();


    const fieldType =
        document
            .getElementById(
                "fieldType"
            )
            .value;


    const required =
        document
            .getElementById(
                "fieldRequired"
            )
            .checked;


    const optionsText =
        document
            .getElementById(
                "dropdownOptions"
            )
            .value
            .trim();


    if (!fieldName) {

        showToast(
            "Field name is required",
            "error"
        );

        return;

    }


    let dropdownOptions = null;


    if (
        fieldType === "dropdown"
    ) {

        dropdownOptions =
            optionsText
                .split(",")
                .map(
                    option =>
                        option.trim()
                )
                .filter(
                    option =>
                        option
                );


        if (
            dropdownOptions.length === 0
        ) {

            showToast(
                "Enter at least one dropdown option",
                "error"
            );

            return;

        }

    }


    const payload = {

        field_name:
            fieldName,

        field_type:
            fieldType,

        required:
            required,

        dropdown_options:
            dropdownOptions

    };


    try {

        let response;


        if (editingFieldId) {

            response =
                await fetch(
                    `${API_BASE}/fields/${editingFieldId}`,
                    {

                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                payload
                            )

                    }
                );

        } else {

            response =
                await fetch(
                    `${API_BASE}/fields/`,
                    {

                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                payload
                            )

                    }
                );

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                extractError(data)
            );

        }


        showToast(

            editingFieldId
                ? "Field updated successfully"
                : "Field created successfully",

            "success"

        );


        cancelFieldForm();


        await loadFields();


        await loadMachines();


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function editField(
    fieldId
) {

    const field =
        fields.find(
            item =>
                item.id === fieldId
        );


    if (!field) {
        return;
    }


    editingFieldId =
        fieldId;


    document
        .getElementById(
            "fieldName"
        )
        .value =
        field.field_name;


    document
        .getElementById(
            "fieldType"
        )
        .value =
        field.field_type;


    document
        .getElementById(
            "fieldRequired"
        )
        .checked =
        field.required;


    document
        .getElementById(
            "dropdownOptions"
        )
        .value =

        field.dropdown_options
            ? field.dropdown_options.join(
                ", "
            )
            : "";


    handleFieldTypeChange();


    const container =
        document.getElementById(
            "fieldFormContainer"
        );


    container.classList.remove(
        "hidden"
    );


    const submitButton =
        document.querySelector(
            "#fieldForm button[type='submit']"
        );


    submitButton.textContent =
        "Update Field";


    container.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


async function deleteField(
    fieldId
) {

    const field =
        fields.find(
            item =>
                item.id === fieldId
        );


    if (!field) {
        return;
    }


    const confirmed =
        confirm(
            `Delete field "${field.field_name}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/fields/${fieldId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                extractError(data)
            );

        }


        showToast(
            "Field deleted successfully",
            "success"
        );


        await loadFields();

        await loadMachines();


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function resetFieldForm() {

    editingFieldId =
        null;


    document
        .getElementById(
            "fieldForm"
        )
        .reset();


    document
        .getElementById(
            "fieldType"
        )
        .value =
        "text";


    document
        .getElementById(
            "dropdownOptionsGroup"
        )
        .classList.add(
            "hidden"
        );


    const submitButton =
        document.querySelector(
            "#fieldForm button[type='submit']"
        );


    submitButton.textContent =
        "Save Field";

}


// ======================================================
// MACHINE MANAGEMENT
// ======================================================

async function loadMachines() {

    try {

        const response =
            await fetch(
                `${API_BASE}/machines/`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load machines"
            );

        }


        machines =
            await response.json();


        renderMachines();

        renderPredictionMachines();


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function renderMachineForm() {

    const container =
        document.getElementById(
            "machineFields"
        );


    container.innerHTML = "";


    if (fields.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⚙
                </div>

                <h3>
                    No machine fields configured
                </h3>

                <p>
                    Add fields above to start
                    creating machines.
                </p>

            </div>

        `;

        return;

    }


    fields.forEach(
        field => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "form-control";


            const requiredMark =
                field.required
                    ? "*"
                    : "";


            let inputHTML = "";


            if (
                field.field_type ===
                "dropdown"
            ) {

                const options =
                    field.dropdown_options ||
                    [];


                inputHTML = `

                    <select
                        id="machine-field-${field.id}"
                    >

                        <option value="">
                            Select ${escapeHTML(
                                field.field_name
                            )}
                        </option>

                        ${
                            options
                                .map(
                                    option =>
                                        `
                                        <option
                                            value="${escapeHTML(
                                                option
                                            )}"
                                        >
                                            ${escapeHTML(
                                                option
                                            )}
                                        </option>
                                        `
                                )
                                .join("")
                        }

                    </select>

                `;

            } else {

                const inputType =
                    field.field_type ===
                    "number"

                        ? "number"

                        : "text";


                inputHTML = `

                    <input
                        type="${inputType}"
                        id="machine-field-${field.id}"
                        placeholder="Enter ${escapeHTML(
                            field.field_name
                        )}"
                    >

                `;

            }


            wrapper.innerHTML = `

                <label>

                    ${escapeHTML(
                        field.field_name
                    )}

                    ${
                        requiredMark

                        ? `
                            <span
                                class="required-star"
                            >
                                *
                            </span>
                        `

                        : ""
                    }

                </label>


                ${inputHTML}

            `;


            container.appendChild(
                wrapper
            );

        }
    );

}


function getMachineFormValues() {

    const values = {};


    fields.forEach(
        field => {

            const input =
                document.getElementById(
                    `machine-field-${field.id}`
                );


            if (!input) {
                return;
            }


            let value =
                input.value;


            if (
                field.field_type ===
                    "number"
                &&
                value !== ""
            ) {

                value =
                    Number(value);

            }


            values[
                field.field_name
            ] =
                value;

        }
    );


    return values;

}


function fillMachineForm(
    machine
) {

    fields.forEach(
        field => {

            const input =
                document.getElementById(
                    `machine-field-${field.id}`
                );


            if (!input) {
                return;
            }


            const value =
                machine.field_values[
                    field.field_name
                ];


            input.value =
                value !== undefined
                    ? value
                    : "";

        }
    );

}


async function saveMachine(
    event
) {

    event.preventDefault();


    if (fields.length === 0) {

        showToast(
            "Create machine fields first",
            "error"
        );

        return;

    }


    const values =
        getMachineFormValues();


    try {

        let response;


        if (editingMachineId) {

            response =
                await fetch(
                    `${API_BASE}/machines/${editingMachineId}`,
                    {

                        method:
                            "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                field_values:
                                    values
                            })

                    }
                );

        } else {

            response =
                await fetch(
                    `${API_BASE}/machines/`,
                    {

                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                field_values:
                                    values
                            })

                    }
                );

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                extractError(data)
            );

        }


        showToast(

            editingMachineId
                ? "Machine updated successfully"
                : "Machine created successfully",

            "success"

        );


        resetMachineForm();


        await loadMachines();


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function renderMachines() {

    const tbody =
        document.getElementById(
            "machinesTableBody"
        );


    const count =
        document.getElementById(
            "machineCount"
        );


    count.textContent =
        machines.length;


    tbody.innerHTML = "";


    if (machines.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="3">

                    <div class="empty-state">

                        <div class="empty-icon">
                            ⚙
                        </div>

                        <h3>
                            No machines created
                        </h3>

                        <p>
                            Create a machine using
                            the configured fields.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    machines.forEach(
        machine => {

            const row =
                document.createElement(
                    "tr"
                );


            const parameters =
                Object.entries(
                    machine.field_values
                )
                .map(
                    ([key, value]) =>
                        `

                        <span
                            class="parameter-chip"
                        >

                            <strong>
                                ${escapeHTML(
                                    key
                                )}:
                            </strong>

                            ${escapeHTML(
                                String(value)
                            )}

                        </span>

                        `
                )
                .join("");


            row.innerHTML = `

                <td>

                    <strong>
                        Machine #${machine.id}
                    </strong>

                </td>


                <td>

                    <div
                        class="parameter-list"
                    >

                        ${parameters}

                    </div>

                </td>


                <td>

                    <div
                        class="action-buttons"
                    >

                        <button
                            class="action-btn edit"
                            onclick="editMachine(${machine.id})"
                        >
                            Edit
                        </button>


                        <button
                            class="action-btn delete"
                            onclick="deleteMachine(${machine.id})"
                        >
                            Delete
                        </button>

                    </div>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


function editMachine(
    machineId
) {

    const machine =
        machines.find(
            item =>
                item.id === machineId
        );


    if (!machine) {
        return;
    }


    editingMachineId =
        machineId;


    fillMachineForm(
        machine
    );


    const submitButton =
        document.querySelector(
            "#machineForm button[type='submit']"
        );


    submitButton.textContent =
        "Update Machine";


    document
        .querySelector(
            ".machine-create-card"
        )
        .scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

}


async function deleteMachine(
    machineId
) {

    const confirmed =
        confirm(
            `Delete Machine #${machineId}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/machines/${machineId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                extractError(data)
            );

        }


        delete predictionCache[
            machineId
        ];


        showToast(
            "Machine deleted successfully",
            "success"
        );


        await loadMachines();


        updateHighRiskCount();


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    }

}


function resetMachineForm() {

    editingMachineId =
        null;


    document
        .getElementById(
            "machineForm"
        )
        .reset();


    const submitButton =
        document.querySelector(
            "#machineForm button[type='submit']"
        );


    submitButton.textContent =
        "Save Machine";

}


// ======================================================
// PREDICTION
// ======================================================

function renderPredictionMachines() {

    const select =
        document.getElementById(
            "predictionMachine"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `

        <option value="">
            Select a machine
        </option>

    `;


    machines.forEach(
        machine => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                machine.id;


            option.textContent =
                `Machine #${machine.id}`;


            select.appendChild(
                option
            );

        }
    );

}


async function runPrediction() {

    const machineSelect =
        document.getElementById(
            "predictionMachine"
        );


    const modelSelect =
        document.getElementById(
            "predictionModel"
        );


    const machineId =
        machineSelect.value;


    const modelName =
        modelSelect.value;


    if (!machineId) {

        showToast(
            "Select a machine first",
            "error"
        );

        return;

    }


    if (!modelName) {

        showToast(
            "Select an ML model first",
            "error"
        );

        return;

    }


    const button =
        document.getElementById(
            "predictButton"
        );


    button.disabled =
        true;


    button.innerHTML = `
        <span>
            ◌
        </span>

        Running ML Model...
    `;


    try {

        const response =
            await fetch(

                `${API_BASE}/prediction/${machineId}?model_name=${encodeURIComponent(
                    modelName
                )}`,

                {
                    method:
                        "POST"
                }

            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                extractError(data)
            );

        }


        predictionCache[
            machineId
        ] =
            data.risk_level;


        displayPrediction(
            data
        );


        updateHighRiskCount();


        showToast(
            `${data.model.name} prediction completed`,
            "success"
        );


    } catch (error) {

        showToast(
            error.message,
            "error"
        );

    } finally {

        button.disabled =
            false;


        button.innerHTML = `
            <span>
                ◉
            </span>

            Run Risk Prediction
        `;

    }

}


function displayPrediction(
    data
) {

    const result =
        document.getElementById(
            "predictionResult"
        );


    const riskLevel =
        document.getElementById(
            "riskLevel"
        );


    const details =
        document.getElementById(
            "predictionDetails"
        );


    result.classList.remove(
        "hidden"
    );


    riskLevel.textContent =
        data.risk_level;


    riskLevel.className =
        "risk-badge " +
        data.risk_level.toLowerCase();


    details.innerHTML = `

        <div class="prediction-stat">

            <span>
                MACHINE
            </span>

            <strong>
                #${data.machine_id}
            </strong>

        </div>


        <div class="prediction-stat">

            <span>
                ML MODEL
            </span>

            <strong>
                ${escapeHTML(
                    data.model.name
                )}
            </strong>

        </div>


        <div class="prediction-stat">

            <span>
                TEMPERATURE
            </span>

            <strong>
                ${data.inputs_used.Temperature}
            </strong>

        </div>


        <div class="prediction-stat">

            <span>
                PRESSURE
            </span>

            <strong>
                ${data.inputs_used.Pressure}
            </strong>

        </div>


        <div class="prediction-stat">

            <span>
                VIBRATION
            </span>

            <strong>
                ${escapeHTML(
                    data.inputs_used.Vibration
                )}
            </strong>

        </div>


        <div class="prediction-note">

            <span>
                MODEL INFORMATION
            </span>

            <p>
                ${escapeHTML(
                    data.note
                )}
            </p>

        </div>

    `;


    result.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// ======================================================
// HIGH RISK KPI
// ======================================================

function updateHighRiskCount() {

    const highRiskCount =
        Object.values(
            predictionCache
        )
        .filter(
            risk =>
                risk === "High"
        )
        .length;


    document
        .getElementById(
            "highRiskCount"
        )
        .textContent =
        highRiskCount;

}


// ======================================================
// NAVIGATION
// ======================================================

function scrollToSection(
    sectionId
) {

    const section =
        document.getElementById(
            sectionId
        );


    if (!section) {
        return;
    }


    section.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


document.addEventListener(
    "click",
    event => {

        const navItem =
            event.target.closest(
                ".nav-item"
            );


        if (!navItem) {
            return;
        }


        document
            .querySelectorAll(
                ".nav-item"
            )
            .forEach(
                item =>
                    item.classList.remove(
                        "active"
                    )
            );


        navItem.classList.add(
            "active"
        );

    }
);


// ======================================================
// ERROR HANDLING
// ======================================================

function extractError(
    data
) {

    if (!data) {

        return "Something went wrong";

    }


    if (
        typeof data.detail ===
        "string"
    ) {

        return data.detail;

    }


    if (
        typeof data.detail ===
        "object"
    ) {

        return Object.entries(
            data.detail
        )
        .map(
            ([key, value]) =>
                `${key}: ${value}`
        )
        .join(
            " | "
        );

    }


    return "Something went wrong";

}


// ======================================================
// TOAST
// ======================================================

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.className =
        `toast ${type} show`;


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3500
    );

}


// ======================================================
// HTML ESCAPING
// ======================================================

function escapeHTML(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}