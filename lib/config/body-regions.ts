import { BodyRegion } from "@/types/body-map";

export const BODY_REGIONS: BodyRegion[] = [
    // ========================================
    // ANTERIOR (LEFT FIGURE)
    // ========================================

    // Head
    { region_id: "ANT_HEAD", region_name: "Head (Front)", view: "anterior", side: "midline", x: 18.5, y: 1.0, width: 12.5, height: 15.0 },

    // Shoulders
    { region_id: "ANT_SHLDR_R", region_name: "Front Right Shoulder", view: "anterior", side: "right", x: 11.5, y: 16.0, width: 13.0, height: 4.5 },
    { region_id: "ANT_SHLDR_L", region_name: "Front Left Shoulder", view: "anterior", side: "left", x: 24.5, y: 16.0, width: 13.0, height: 4.5 },

    // Chest
    { region_id: "ANT_CHEST_R", region_name: "Front Right Chest", view: "anterior", side: "right", x: 15.0, y: 20.5, width: 9.5, height: 12.0 },
    { region_id: "ANT_CHEST_L", region_name: "Front Left Chest", view: "anterior", side: "left", x: 24.5, y: 20.5, width: 9.5, height: 12.0 },

    // Arms
    { region_id: "ANT_ARM_UP_R", region_name: "Front Right Upper Arm", view: "anterior", side: "right", x: 9.0, y: 20.5, width: 6.0, height: 16.0 },
    { region_id: "ANT_ARM_UP_L", region_name: "Front Left Upper Arm", view: "anterior", side: "left", x: 34.0, y: 20.5, width: 6.0, height: 16.0 },
    { region_id: "ANT_ARM_LO_R", region_name: "Front Right Lower Arm", view: "anterior", side: "right", x: 7.0, y: 36.5, width: 8.0, height: 11.0 },
    { region_id: "ANT_ARM_LO_L", region_name: "Front Left Lower Arm", view: "anterior", side: "left", x: 34.0, y: 36.5, width: 8.0, height: 11.0 },

    // Hands
    { region_id: "ANT_HAND_R", region_name: "Front Right Hand", view: "anterior", side: "right", x: 3.0, y: 47.5, width: 8.5, height: 9.0 },
    { region_id: "ANT_HAND_L", region_name: "Front Left Hand", view: "anterior", side: "left", x: 37.5, y: 47.5, width: 8.5, height: 9.0 },

    // Torso
    { region_id: "ANT_ABDOMEN", region_name: "Abdomen", view: "anterior", side: "midline", x: 15.0, y: 32.0, width: 19.0, height: 13.0 },
    { region_id: "ANT_PELVIS", region_name: "Pelvic Region", view: "anterior", side: "midline", x: 15.0, y: 45.0, width: 19.0, height: 9.0 },

    // Legs
    { region_id: "ANT_THIGH_R", region_name: "Front Right Thigh", view: "anterior", side: "right", x: 16.5, y: 54.0, width: 8.0, height: 14.0 },
    { region_id: "ANT_THIGH_L", region_name: "Front Left Thigh", view: "anterior", side: "left", x: 24.5, y: 54.0, width: 8.0, height: 14.0 },
    { region_id: "ANT_KNEE_R", region_name: "Front Right Knee", view: "anterior", side: "left", x: 16.5, y: 67.5, width: 8.0, height: 8.0 },
    { region_id: "ANT_KNEE_L", region_name: "Front Left Knee", view: "anterior", side: "left", x: 24.5, y: 67.5, width: 8.0, height: 8.0 },
    { region_id: "ANT_SHIN_R", region_name: "Front Right Shin", view: "anterior", side: "right", x: 16.5, y: 75.5, width: 8.0, height: 13.0 },
    { region_id: "ANT_SHIN_L", region_name: "Front Left Shin", view: "anterior", side: "left", x: 24.5, y: 75.5, width: 8.0, height: 13.0 },

    // Feet
    { region_id: "ANT_FOOT_R", region_name: "Front Right Foot", view: "anterior", side: "right", x: 16.5, y: 88.5, width: 8.0, height: 9.5 },
    { region_id: "ANT_FOOT_L", region_name: "Front Left Foot", view: "anterior", side: "left", x: 24.5, y: 88.5, width: 8.0, height: 9.5 },

    // ========================================
    // POSTERIOR (RIGHT FIGURE)
    // ========================================

    // Head
    { region_id: "POST_HEAD", region_name: "Back Head", view: "posterior", side: "midline", x: 68.5, y: 0.5, width: 12.5, height: 15.0 },

    // Shoulders
    { region_id: "POST_SHLDR_R", region_name: "Back Right Shoulder", view: "posterior", side: "right", x: 75.0, y: 15.5, width: 13.0, height: 4.5 },
    { region_id: "POST_SHLDR_L", region_name: "Back Left Shoulder", view: "posterior", side: "left", x: 62.0, y: 15.5, width: 13.0, height: 4.5 },

    // Back
    { region_id: "POST_BACK_UP", region_name: "Upper Back", view: "posterior", side: "midline", x: 66.5, y: 20.0, width: 16.5, height: 12.0 },
    { region_id: "POST_LUMBAR", region_name: "Lower Back", view: "posterior", side: "midline", x: 66.5, y: 32.0, width: 16.5, height: 11.0 },
    { region_id: "POST_GLUTE", region_name: "Gluteal Region", view: "posterior", side: "midline", x: 66.5, y: 43.0, width: 16.5, height: 11.0 },

    // Arms
    { region_id: "POST_ARM_UP_R", region_name: "Back Right Upper Arm", view: "posterior", side: "right", x: 83.0, y: 20.0, width: 6.0, height: 16.0 },
    { region_id: "POST_ARM_UP_L", region_name: "Back Left Upper Arm", view: "posterior", side: "left", x: 60.5, y: 20.0, width: 6.0, height: 16.0 },
    { region_id: "POST_ARM_LO_R", region_name: "Back Right Lower Arm", view: "posterior", side: "right", x: 83.0, y: 36.0, width: 8.0, height: 11.0 },
    { region_id: "POST_ARM_LO_L", region_name: "Back Left Lower Arm", view: "posterior", side: "left", x: 58.5, y: 36.0, width: 8.0, height: 11.0 },

    // Hands
    { region_id: "POST_HAND_R", region_name: "Back Right Hand", view: "posterior", side: "right", x: 87.5, y: 47.0, width: 8.5, height: 9.0 },
    { region_id: "POST_HAND_L", region_name: "Back Left Hand", view: "posterior", side: "left", x: 53.5, y: 47.0, width: 8.5, height: 9.0 },

    // Legs
    { region_id: "POST_THIGH_R", region_name: "Back Right Thigh", view: "posterior", side: "right", x: 75.0, y: 54.0, width: 8.0, height: 14.0 },
    { region_id: "POST_THIGH_L", region_name: "Back Left Thigh", view: "posterior", side: "left", x: 67.0, y: 54.0, width: 8.0, height: 14.0 },
    { region_id: "POST_KNEE_R", region_name: "Back Right Knee", view: "posterior", side: "right", x: 75.0, y: 68.0, width: 8.0, height: 8.0 },
    { region_id: "POST_KNEE_L", region_name: "Back Left Knee", view: "posterior", side: "left", x: 67.0, y: 68.0, width: 8.0, height: 8.0 },
    { region_id: "POST_CALF_R", region_name: "Back Right Calf", view: "posterior", side: "right", x: 75.0, y: 76.0, width: 8.0, height: 13.0 },
    { region_id: "POST_CALF_L", region_name: "Back Left Calf", view: "posterior", side: "left", x: 67.0, y: 76.0, width: 8.0, height: 13.0 },

    // Heels/Feet
    { region_id: "POST_HEEL_R", region_name: "Back Right Heel", view: "posterior", side: "right", x: 75.0, y: 89.0, width: 8.0, height: 9.5 },
    { region_id: "POST_HEEL_L", region_name: "Back Left Heel", view: "posterior", side: "left", x: 67.0, y: 89.0, width: 8.0, height: 9.5 },
];
