import type * as d3 from "d3";

export type MemberDetail = {
	id: string;
	type: "person" | "party";
	nameJa: string;
	nameEn?: string;
	role: string;
	partyId?: string;
	faction?: string;
	photoUrl?: string;
	description: string;
	recentStatements: string[];
	recentDietSpeeches: string[];
	career: string[];
};

export type RelationType =
	| "cabinet"
	| "party_leadership"
	| "ally"
	| "rival"
	| "mentor"
	| "coalition"
	| "former_coalition"
	| "ideological"
	| "partial_cooperation"
	| "opposition"
	| "alumni"
	| "regional"
	| "council_member"
	| "advisor";

export type RelationEdge = {
	id: string;
	source: string;
	target: string;
	labelJa: string;
	relationType: RelationType;
};

// D3 Simulation Types
export interface SimNode extends d3.SimulationNodeDatum {
	id: string;
	type: "person" | "party" | "label" | "cluster";
	meta?: MemberDetail; // For person/party
	edgeId?: string; // For label nodes
	r?: number; // Radius for collision
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
}

export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	id: string;
	relationType: RelationType;
	labelJa: string;
	linkIndex?: number; // For multi-edge curves
	linkTotal?: number; // For multi-edge curves
	source: string | SimNode;
	target: string | SimNode;
}
