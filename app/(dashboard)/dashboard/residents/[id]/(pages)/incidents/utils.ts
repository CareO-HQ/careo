export const generateIncidentPDF = (incident: any, residentName: string) => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Incident Report - ${incident.date}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 20px; }
          .section { margin-bottom: 20px; }
          .field { margin-bottom: 10px; }
          .label { font-weight: bold; color: #666; }
          .value { margin-left: 10px; }
          .header { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Incident Report</h1>
          <div class="field">
            <span class="label">Resident:</span>
            <span class="value">${residentName}</span>
          </div>
          <div class="field">
            <span class="label">Report Date:</span>
            <span class="value">${incident.date} ${incident.time}</span>
          </div>
        </div>
        
        <div class="section">
          <h2>Incident Details</h2>
          <div class="field">
            <span class="label">Type:</span>
            <span class="value">${incident.incident_types?.join(", ") || "N/A"}</span>
          </div>
          <div class="field">
            <span class="label">Level:</span>
            <span class="value">${incident.incident_level?.replace("_", " ").toUpperCase() || "N/A"}</span>
          </div>
          <div class="field">
            <span class="label">Location:</span>
            <span class="value">${incident.home_name} - ${incident.unit}</span>
          </div>
        </div>

        <div class="section">
          <h2>Description</h2>
          <p>${incident.detailed_description || "No description provided"}</p>
        </div>

        <div class="section">
          <h2>Injured Person</h2>
          <div class="field">
            <span class="label">Name:</span>
            <span class="value">${incident.injured_person_first_name} ${incident.injured_person_surname}</span>
          </div>
          <div class="field">
            <span class="label">DOB:</span>
            <span class="value">${incident.injured_person_dob}</span>
          </div>
          <div class="field">
            <span class="label">Status:</span>
            <span class="value">${incident.injured_person_status?.join(", ") || "N/A"}</span>
          </div>
        </div>

        ${incident.treatment_types && incident.treatment_types.length > 0 ? `
        <div class="section">
          <h2>Treatment</h2>
          <div class="field">
            <span class="label">Types:</span>
            <span class="value">${incident.treatment_types.join(", ")}</span>
          </div>
          ${incident.treatment_details ? `
          <div class="field">
            <span class="label">Details:</span>
            <span class="value">${incident.treatment_details}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="section">
          <h2>Report Completion</h2>
          <div class="field">
            <span class="label">Completed By:</span>
            <span class="value">${incident.completed_by_full_name || incident.completedByFullName}</span>
          </div>
          <div class="field">
            <span class="label">Job Title:</span>
            <span class="value">${incident.completed_by_job_title || incident.completedByJobTitle}</span>
          </div>
          <div class="field">
            <span class="label">Date Completed:</span>
            <span class="value">${incident.date_completed || incident.dateCompleted}</span>
          </div>
        </div>
      </body>
    </html>
  `;
};
