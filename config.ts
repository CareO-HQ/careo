export const config = {
  limits: {
    organizations: 3,
    teams: 10,
    size: 1024 * 1024 * 5 // 5MB
  },
  times: [
    {
      name: "Morning",
      values: ["08:00", "10:00", "12:00"]
    },
    {
      name: "Afternoon",
      values: ["14:00", "18:00"]
    },
    {
      name: "Evening",
      values: ["22:00", "00:00"]
    }
  ],
  careFiles: [
    {
      type: "folder",
      key: "preAdmission",
      value: "Pre-Admission",
      description:
        "Pre-Admission Assessment Form and Infection prevention and control pre-admission risk assessment",
      forms: [
        {
          type: "form",
          key: "preAdmission-form",
          value: "Pre-Admission Assessment Form",
          description: "Pre-Admission Assessment Form"
        },
        {
          type: "form",
          key: "infection-prevention",
          value:
            "Infection prevention and control pre-admission risk assessment",
          description:
            "Infection prevention and control pre-admission risk assessment"
        }
      ]
    },
    {
      type: "folder",
      key: "continence",
      value: "Continence",
      description: "Continence Assessment",
      forms: [
        {
          type: "form",
          key: "blader-bowel-form",
          value: "Blader & Bowel continence Assessment",
          description: "Blader & Bowel continence Assessment"
        }
      ]
    }
  ]
};
