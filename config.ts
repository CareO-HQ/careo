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
      key: "preAdmission",
      value: "Pre-Admission Assessment Form"
    },
    {
      key: "admission",
      value: "Admission Assessment Form"
    },
    {
      key: "discharge",
      value: "Discharge Assessment Form"
    }
  ]
};
