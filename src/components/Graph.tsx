import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { edgesData, nodesData } from "../data";
import type { MemberDetail, SimLink, SimNode } from "../types";
import {
	getEdgeColor,
	getEdgeStyle,
	getPartyColor,
} from "../utils/styleHelpers";

const Graph = ({
	onSelectMember,
}: {
	onSelectMember: (m: MemberDetail | null) => void;
}) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	// Resize Observer to fix 0 height issue
	useEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			if (!entries || entries.length === 0) return;
			const { width, height } = entries[0].contentRect;
			if (width > 0 && height > 0) {
				setDimensions({ width, height });
			}
		});
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}
		return () => resizeObserver.disconnect();
	}, []);

	useEffect(() => {
		if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0)
			return;

		const { width, height } = dimensions;
		const clusterPadding = 70;

		// 1. Setup Nodes & Links
		// Create copies to avoid mutation of original data on re-renders
		const nodes: SimNode[] = nodesData
			.filter((d) => d.type !== "party") // Filter out party nodes
			.map((d) => ({
				...d,
				id: d.id,
				type: d.type,
				meta: d,
				r: 45,
			}));

		// Important: Shallow copy edges so D3 can mutate source/target on the COPY
		const links: SimLink[] = edgesData
			.filter((d) => {
				// Filter out links connected to party nodes
				// biome-ignore lint/suspicious/noExplicitAny: d.source can be object or string
				const sourceId = typeof d.source === "object" ? (d.source as any).id : d.source;
				// biome-ignore lint/suspicious/noExplicitAny: d.target can be object or string
				const targetId = typeof d.target === "object" ? (d.target as any).id : d.target;
				const isPartyLink =
					nodesData.find((n) => n.id === sourceId)?.type === "party" ||
					nodesData.find((n) => n.id === targetId)?.type === "party";
				return !isPartyLink;
			})
			.map((d) => ({
				...d,
				source: d.source,
				target: d.target,
			})) as unknown as SimLink[];

		// 2. Handle Multi-edges
		const linkGroups: Record<string, number> = {};
		links.forEach((l) => {
			const s =
				typeof l.source === "object" ? (l.source as SimNode).id : l.source;
			const t =
				typeof l.target === "object" ? (l.target as SimNode).id : l.target;
			const ids = [s, t].sort();
			const key = ids.join("-");
			l.linkIndex = linkGroups[key] || 0;
			linkGroups[key] = (linkGroups[key] || 0) + 1;
		});
		links.forEach((l) => {
			const s =
				typeof l.source === "object" ? (l.source as SimNode).id : l.source;
			const t =
				typeof l.target === "object" ? (l.target as SimNode).id : l.target;
			const ids = [s, t].sort();
			const key = ids.join("-");
			l.linkTotal = linkGroups[key];
		});

		// 3. Create Label Nodes
		const labelNodes: SimNode[] = links.map((l) => ({
			id: `${l.id}_label`,
			type: "label",
			edgeId: l.id,
			r: 20,
		}));

		const partyIds = Array.from(
			new Set(
				nodes
					.map((n) => n.meta?.partyId)
					.filter(
						(id): id is string => typeof id === "string" && id.length > 0,
					),
			),
		);
		const partyNodeGroups = new Map<string, SimNode[]>();
		nodes.forEach((node) => {
			const partyId = node.meta?.partyId;
			if (!partyId) return;
			if (!partyNodeGroups.has(partyId)) {
				partyNodeGroups.set(partyId, []);
			}
			partyNodeGroups.get(partyId)!.push(node);
		});

		type ClusterBounds = {
			minX: number;
			maxX: number;
			minY: number;
			maxY: number;
			cx: number;
			cy: number;
		};

		const createClusterCollisionForce = (
			groups: Map<string, SimNode[]>,
			padding: number,
			clusterNodes: SimNode[],
		) => {
			const force = (alpha: number) => {
				const bounds = new Map<string, ClusterBounds>();
				groups.forEach((members, partyId) => {
					const positioned = members.filter(
						(n) => typeof n.x === "number" && typeof n.y === "number",
					);
					if (positioned.length === 0) return;
					const xList = positioned.map((m) => m.x!);
					const yList = positioned.map((m) => m.y!);
					const minX = Math.min(...xList) - padding;
					const maxX = Math.max(...xList) + padding;
					const minY = Math.min(...yList) - padding;
					const maxY = Math.max(...yList) + padding;
					bounds.set(partyId, {
						minX,
						maxX,
						minY,
						maxY,
						cx: (minX + maxX) / 2,
						cy: (minY + maxY) / 2,
					});
				});

				const entries = Array.from(bounds.entries());
				// Iterate multiple times for stability
				for (let k = 0; k < 3; ++k) {
					for (let i = 0; i < entries.length; i += 1) {
						for (let j = i + 1; j < entries.length; j += 1) {
							const [partyA, boundsA] = entries[i];
							const [partyB, boundsB] = entries[j];

							const overlapX =
								Math.min(boundsA.maxX, boundsB.maxX) -
								Math.max(boundsA.minX, boundsB.minX);
							const overlapY =
								Math.min(boundsA.maxY, boundsB.maxY) -
								Math.max(boundsA.minY, boundsB.minY);

							if (overlapX <= 0 || overlapY <= 0) continue;

							const dx = boundsA.cx - boundsB.cx || (Math.random() - 0.5);
							const dy = boundsA.cy - boundsB.cy || (Math.random() - 0.5);

							// Separate along the axis of least overlap
							let nx = 0;
							let ny = 0;
							let push = 0;

							if (overlapX < overlapY) {
								nx = dx > 0 ? 1 : -1;
								push = overlapX;
							} else {
								ny = dy > 0 ? 1 : -1;
								push = overlapY;
							}

							const strength = alpha * 0.8; // Stronger force
							const pushX = nx * push * strength;
							const pushY = ny * push * strength;

							const nodesA = groups.get(partyA) || [];
							const nodesB = groups.get(partyB) || [];
							const clusterA = clusterNodes.find((c) => c.id === partyA);
							const clusterB = clusterNodes.find((c) => c.id === partyB);

							[...nodesA, clusterA].forEach((node) => {
								if (node) {
									node.vx = (node.vx ?? 0) + pushX;
									node.vy = (node.vy ?? 0) + pushY;
								}
							});
							[...nodesB, clusterB].forEach((node) => {
								if (node) {
									node.vx = (node.vx ?? 0) - pushX;
									node.vy = (node.vy ?? 0) - pushY;
								}
							});
						}
					}
				}
			};
			return force;
		};

		// Cluster Nodes (Invisible centers for parties)
		const clusterNodes: SimNode[] = partyIds.map((partyId) => {
			const members = partyNodeGroups.get(partyId) || [];
			const memberCount = members.length;
			// Estimate radius based on member count
			const r = Math.sqrt(memberCount) * 50 + 40;
			const partyInfo = nodesData.find((n) => n.id === partyId);
			return {
				id: partyId,
				type: "cluster",
				r: r,
				x: width / 2 + (Math.random() - 0.5) * 100,
				y: height / 2 + (Math.random() - 0.5) * 100,
				meta: partyInfo, // Attach party info for label
			};
		});

		const allSimNodes = [...nodes, ...labelNodes, ...clusterNodes];

		// 4. Setup SVG
		const svg = d3
			.select(svgRef.current)
			.attr("viewBox", [0, 0, width, height])
			.style("background-color", "#f8fafc");

		svg.selectAll("*").remove();

		const g = svg.append("g");

		// Zoom
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.2, 3])
			.on("zoom", (event) => {
				g.attr("transform", event.transform);
				d3.selectAll(".link-label").style(
					"opacity",
					event.transform.k < 0.7 ? 0 : 1,
				);
			});
		svg.call(zoom);

		// Background click to deselect
		g.append("rect")
			.attr("width", width * 4)
			.attr("height", height * 4)
			.attr("x", -width * 2)
			.attr("y", -height * 2)
			.attr("fill", "transparent")
			.on("click", () => onSelectMember(null));

		const clusterGroup = g.append("g").attr("class", "clusters");
		const linkGroup = g.append("g").attr("class", "links");
		const linkLabelGroup = g.append("g").attr("class", "link-labels");
		const nodeGroup = g.append("g").attr("class", "nodes");

		// 5. Simulation
		const simulation = d3
			.forceSimulation(allSimNodes)
			.force(
				"link",
				d3
					.forceLink<SimNode, SimLink>(links)
					.id((d) => d.id)
					.distance(180)
					.strength(0.3),
			)
			.force(
				"charge",
				d3
					.forceManyBody<SimNode>()
					.strength((d) => {
						if (d.type === "cluster") return -100;
						return d.type === "party" ? -1200 : -450;
					}),
			)
			.force(
				"collide",
				d3
					.forceCollide<SimNode>()
					.radius((d) => (d.r || 0) + 10)
					.iterations(3),
			)
			.force("x", d3.forceX(width / 2).strength(0.06))
			.force("y", d3.forceY(height / 2).strength(0.06))
			.force(
				"clusterCollision",
				createClusterCollisionForce(partyNodeGroups, clusterPadding, clusterNodes),
			)
			.force("clusterGrouping", (alpha) => {
				nodes.forEach((d) => {
					const cluster = clusterNodes.find((c) => c.id === d.meta?.partyId);
					if (cluster) {
						const k = alpha * 0.15;
						d.vx! += (cluster.x! - d.x!) * k;
						d.vy! += (cluster.y! - d.y!) * k;
					}
				});
			});

		const forceLabelConstraints = (alpha: number) => {
			labelNodes.forEach((d) => {
				const link = links.find((l) => l.id === d.edgeId);
				if (link) {
					const s = link.source as SimNode;
					const t = link.target as SimNode;
					if (!s.x || !t.x || !s.y || !t.y) return;

					const mx = (s.x + t.x) / 2;
					const my = (s.y + t.y) / 2;

					d.vx! += (mx - d.x!) * alpha * 0.9;
					d.vy! += (my - d.y!) * alpha * 0.9;
				}
			});
		};
		simulation.force("labelConstraints", forceLabelConstraints);

		// 6. Rendering

		// Clusters
		const clusters = clusterGroup
			.selectAll("rect")
			.data(clusterNodes)
			.join("rect")
			.attr("class", "cluster-box")
			.attr("rx", 20)
			.attr("fill", (d) => getPartyColor(d.id))
			.attr("stroke", (d) => getPartyColor(d.id))
			.style("cursor", "grab")
			.call(
				d3
					.drag<SVGRectElement, SimNode>()
					.on("start", dragstarted)
					.on("drag", dragged)
					.on("end", dragended) as any,
			);

		// Cluster Labels
		const clusterLabels = clusterGroup
			.selectAll("text")
			.data(clusterNodes)
			.join("text")
			.attr("class", "cluster-label")
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "hanging")
			.style("font-weight", "bold")
			.style("font-size", "16px")
			.style("fill", (d) => getPartyColor(d.id))
			.style("pointer-events", "none") // Let clicks pass through to the rect
			.text((d) => d.meta?.nameJa || d.id);

		// Defs (Clip Paths)
		const defs = svg.append("defs");
		nodes.forEach((d) => {
			if (d.type !== "label") {
				defs
					.append("clipPath")
					.attr("id", `clip-${d.id}`)
					.append("circle")
					.attr("r", d.type === "party" ? 40 : 30);
			}
		});

		// Links
		const link = linkGroup
			.selectAll("path")
			.data(links)
			.join("path")
			.attr("class", "link")
			.attr("stroke", (d) => getEdgeColor(d.relationType))
			.attr("stroke-width", (d) => (d.relationType === "cabinet" ? 3 : 1.5))
			.attr("stroke-dasharray", (d) => getEdgeStyle(d.relationType));

		// Link Labels
		const linkLabel = linkLabelGroup
			.selectAll("g")
			.data(labelNodes)
			.join("g")
			.attr("class", "link-label")
			.style("cursor", "default");

		linkLabel
			.append("rect")
			.attr("class", "link-label-bg")
			.attr("rx", 4)
			.attr("ry", 4);

		linkLabel.append("text").text((d) => {
			const l = links.find((link) => link.id === d.edgeId);
			return l ? l.labelJa : "";
		});

		// Nodes
		const node = nodeGroup
			.selectAll("g")
			.data(nodes)
			.join("g")
			.attr("class", "node")
			.style("cursor", "pointer")
			.call(
				d3
					.drag<SVGGElement, SimNode>()
					.on("start", dragstarted)
					.on("drag", dragged)
					// biome-ignore lint/suspicious/noExplicitAny: D3 typings issue
					.on("end", dragended) as any,
			);

		node
			.append("circle")
			.attr("r", (d) => (d.type === "party" ? 42 : 32))
			.attr("fill", "white")
			.attr("stroke", (d) => getPartyColor(d.meta?.partyId))
			.attr("stroke-width", 3);

		node
			.append("image")
			.attr("xlink:href", (d) => d.meta?.photoUrl || "")
			.attr("x", (d) => (d.type === "party" ? -40 : -30))
			.attr("y", (d) => (d.type === "party" ? -40 : -30))
			.attr("width", (d) => (d.type === "party" ? 80 : 60))
			.attr("height", (d) => (d.type === "party" ? 80 : 60))
			.attr("clip-path", (d) => `url(#clip-${d.id})`)
			.on("error", function () {
				d3.select(this).style("opacity", 0);
			});

		// Fallback initials
		node
			.append("text")
			.attr("dy", ".35em")
			.attr("text-anchor", "middle")
			.style("font-size", "20px")
			.style("fill", "#555")
			.text((d) => (d.meta?.photoUrl ? "" : d.meta?.nameJa[0] || ""));

		node
			.append("text")
			.attr("dy", (d) => (d.type === "party" ? 55 : 45))
			.attr("text-anchor", "middle")
			.style("font-size", (d) => (d.type === "party" ? "14px" : "12px"))
			.style("fill", "#1e293b")
			.style("font-weight", "bold")
			.text((d) => d.meta?.nameJa || "");

		// Events
		node.on("click", (e, d) => {
			e.stopPropagation();
			if (d.meta) onSelectMember(d.meta);
		});

		node.on("mouseenter", (_e, d) => {
			const connectedNodeIds = new Set<string>();
			connectedNodeIds.add(d.id);
			const connectedLinkIds = new Set<string>();

			links.forEach((l) => {
				const s = l.source as SimNode;
				const t = l.target as SimNode;
				if (s.id === d.id || t.id === d.id) {
					connectedNodeIds.add(s.id);
					connectedNodeIds.add(t.id);
					connectedLinkIds.add(l.id);
				}
			});

			node.classed("dimmed", (n) => !connectedNodeIds.has(n.id));
			link.classed("dimmed", (l) => !connectedLinkIds.has(l.id));
			link.filter((l) => connectedLinkIds.has(l.id)).attr("stroke-width", 3);
			linkLabel.classed("dimmed", (l) => !connectedLinkIds.has(l.edgeId!));
		});

		node.on("mouseleave", () => {
			node.classed("dimmed", false);
			link
				.classed("dimmed", false)
				.attr("stroke-width", (d) => (d.relationType === "cabinet" ? 3 : 1.5));
			linkLabel.classed("dimmed", false);
		});

		simulation.on("tick", () => {
			// Clusters
			clusters.each(function (d) {
				const members = partyNodeGroups.get(d.id) || [];
				const positioned = members.filter(
					(m) => typeof m.x === "number" && typeof m.y === "number",
				);
				if (positioned.length === 0) return;
				const xList = positioned.map((m) => m.x!);
				const yList = positioned.map((m) => m.y!);
				const minX = Math.min(...xList) - clusterPadding;
				const maxX = Math.max(...xList) + clusterPadding;
				const minY = Math.min(...yList) - clusterPadding;
				const maxY = Math.max(...yList) + clusterPadding;
				
				// Update rect
				d3.select(this)
					.attr("x", minX)
					.attr("y", minY)
					.attr("width", maxX - minX)
					.attr("height", maxY - minY);
				
				// Update label position (top left corner + padding)
				clusterLabels
					.filter(l => l.id === d.id)
					.attr("x", minX + 10)
					.attr("y", minY + 10)
					.attr("text-anchor", "start");
			});

			// Links
			link.attr("d", (d) => {
				const s = d.source as SimNode;
				const t = d.target as SimNode;
				if ((d.linkTotal || 0) > 1) {
					const index = d.linkIndex || 0;
					const total = d.linkTotal || 1;
					const spread = (index - (total - 1) / 2) * 40;
					const mx = (s.x! + t.x!) / 2;
					const my = (s.y! + t.y!) / 2;
					const dx = t.x! - s.x!;
					const dy = t.y! - s.y!;
					const len = Math.sqrt(dx * dx + dy * dy);
					const nx = -dy / (len || 1);
					const ny = dx / (len || 1);
					const cx = mx + nx * spread;
					const cy = my + ny * spread;
					return `M${s.x},${s.y} Q${cx},${cy} ${t.x},${t.y}`;
				} else {
					return `M${s.x},${s.y} L${t.x},${t.y}`;
				}
			});

			node.attr("transform", (d) => `translate(${d.x},${d.y})`);
			linkLabel.attr("transform", (d) => `translate(${d.x},${d.y})`);

			linkLabel.each(function () {
				const g = d3.select(this);
				const text = g.select("text");
				const bbox = (text.node() as SVGGraphicsElement).getBBox();
				g.select("rect")
					.attr("x", bbox.x - 4)
					.attr("y", bbox.y - 2)
					.attr("width", bbox.width + 8)
					.attr("height", bbox.height + 4);
			});
		});

		// biome-ignore lint/suspicious/noExplicitAny: Not sure of event type
		function dragstarted(event: any, d: SimNode) {
			if (!event.active) simulation.alphaTarget(0.3).restart();
			d.fx = d.x;
			d.fy = d.y;
		}
		// biome-ignore lint/suspicious/noExplicitAny: Not sure of event type
		function dragged(event: any, d: SimNode) {
			d.fx = event.x;
			d.fy = event.y;
		}
		// biome-ignore lint/suspicious/noExplicitAny: Not sure of event type
		function dragended(event: any, d: SimNode) {
			if (!event.active) simulation.alphaTarget(0);
			d.fx = null;
			d.fy = null;
		}

		return () => {
			simulation.stop();
		};
	}, [dimensions, onSelectMember]); // Re-run only when dimensions change

	return (
		<div ref={containerRef} className="w-full h-full relative bg-slate-50">
			<div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur p-3 rounded-lg shadow text-sm border border-gray-200 select-none">
				<h3 className="font-bold text-gray-800 mb-2">凡例</h3>
				<div className="grid grid-cols-2 gap-2 gap-x-4">
					<div className="flex items-center">
						<span className="w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
						閣僚任命
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 bg-green-600 rounded-full mr-2"></span>
						側近・盟友
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 border border-red-600 border-dashed rounded-full mr-2"></span>
						ライバル
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 bg-purple-600 rounded-full mr-2"></span>
						連立
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
						党役員
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></span>
						後ろ盾
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 bg-sky-500 rounded-full mr-2"></span>
						部分連合
					</div>
					<div className="flex items-center">
						<span className="w-3 h-3 border border-slate-800 border-dashed rounded-full mr-2"></span>
						野党・対立
					</div>
				</div>
				<div className="mt-2 text-xs text-gray-500">
					スクロールでズーム / ドラッグで移動
				</div>
			</div>
			<svg
				ref={svgRef}
				className="w-full h-full touch-none cursor-move block"
				role="img"
				aria-labelledby="graphTitle"
			>
				<title id="graphTitle">Relationship chart</title>
			</svg>
		</div>
	);
};

export default Graph;
