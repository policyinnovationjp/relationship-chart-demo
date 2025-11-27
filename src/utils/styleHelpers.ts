import type { RelationType } from "../types";

export const getEdgeColor = (type: RelationType) => {
	switch (type) {
		case "cabinet":
			return "#2563eb"; // blue-600
		case "ally":
			return "#16a34a"; // green-600
		case "rival":
			return "#dc2626"; // red-600
		case "coalition":
			return "#9333ea"; // purple-600
		case "former_coalition":
			return "#9ca3af"; // gray-400
		case "ideological":
			return "#3730a3"; // indigo-800
		case "party_leadership":
			return "#f97316"; // orange-500
		case "mentor":
			return "#ca8a04"; // yellow-600
		case "partial_cooperation":
			return "#0ea5e9"; // sky-500
		case "opposition":
			return "#1e293b"; // slate-800
		case "alumni":
			return "#8b5cf6"; // violet-500
		case "regional":
			return "#ec4899"; // pink-500
		case "council_member":
			return "#06b6d4"; // cyan-500
		case "advisor":
			return "#22d3ee"; // cyan-400
		default:
			return "#999";
	}
};

export const getEdgeStyle = (type: RelationType) => {
	if (type === "rival" || type === "former_coalition" || type === "opposition")
		return "5,3"; // Dashed
	return "";
};

export const getPartyColor = (partyId?: string) => {
	switch (partyId) {
		case "party_ldp":
			return "#ef4444"; // Red-ish
		case "party_ishin":
			return "#22c55e"; // Green-ish
		case "party_komeito":
			return "#eab308"; // Yellow-ish
		case "party_dpp":
			return "#fbbf24"; // Amber (DPP color is usually yellow/orange)
		case "party_cdp":
			return "#3b82f6"; // Blue (CDP color)
		case "group_private":
			return "#14b8a6"; // Teal for private advisors
		default:
			return "#cbd5e1";
	}
};
