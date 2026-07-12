MAHINDRA_TRACTOR_V1 = {
    "title": "TRACTOR INSPECTION SHEET",
    "required_texts": ["MAHINDRA", "TRACTOR INSPECTION SHEET"],
    "zones": {
        "header": {
            "start_labels": ["TRACTOR INSPECTION SHEET", "TRACTOR NO"],
            "end_labels": ["CHECK POINTS", "ROAD TESTING"],
        },
        "checklist": {
            "start_labels": ["CHECK POINTS", "ROAD TESTING"],
            "end_labels": ["DEFECT DETAILS", "DEFECT"],
        },
        "defects": {
            "start_labels": ["DEFECT DETAILS", "DEFECT"],
            "end_labels": ["SHORTAGES", "SHORTAGE"],
        },
        "shortages": {
            "start_labels": ["SHORTAGES", "SHORTAGE"],
            "end_labels": ["REV. NO", "REV.", "FORMAT"],
        },
        "footer": {
            "start_labels": ["REV. NO", "REV.", "FORMAT"],
            "end_labels": [],
        },
    },
    "fields": {
        "tractor_no": {
            "labels": ["TRACTOR NO", "TRACTOR NO.", "TRACTOR NO / IDENTIFIER"],
            "direction": "down",
        },
        "model": {
            "labels": ["MODEL", "TRACTOR MODEL"],
            "direction": "right",
        },
        "date": {
            "labels": ["DATE", "DATE:", "INSPECTION DATE"],
            "direction": "down",
        },
        "shift": {
            "labels": ["SHIFT", "SHFT", "SHIFT:"],
            "direction": "down",
        },
        "line_no": {
            "labels": ["LINE", "LINE I STAGE", "LINE / STAGE", "LINE NO"],
            "direction": "down",
        },
        "inspector": {
            "labels": ["INSPECTOR", "INSPECTOR NAME", "INSPECTED BY"],
            "direction": "right",
        },
        "engine_no": {
            "labels": ["ENGINE NO", "ENGINE", "ENGINE NO."],
            "direction": "right",
        },
        "chassis_no": {
            "labels": ["CHASSIS NO", "CHASSIS", "CHASSIS NO."],
            "direction": "right",
        },
    },
    "defect_table": {
        "sr_no_label": "SR. NO.",
        "description_label": "DEFECT DESCRIPTION",
        "repaired_by_label": "REPAIREO BY",
        "verified_by_label": "FINAL VERIFIED BY",
    },
}

TEMPLATES = {
    "mahindra_tractor_v1": MAHINDRA_TRACTOR_V1,
}
