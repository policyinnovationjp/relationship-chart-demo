import type { MemberDetail } from "../types";

const DetailPanel = ({ member }: { member: MemberDetail | null }) => {
	if (!member) {
		return (
			<div className="h-full flex items-center justify-center text-gray-400 p-6 text-center">
				<div className="animate-pulse">
					<p>
						ノードをクリックして
						<br />
						詳細を表示
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto p-6 bg-white shadow-lg border-l border-gray-200">
			<div className="flex flex-col items-center mb-6">
				<div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-gray-100 shadow-md relative bg-gray-200">
					{member.photoUrl ? (
						<img
							src={member.photoUrl}
							alt={member.nameJa}
							className="w-full h-full object-cover"
							// onError={(e) => {
							// 	(e.target as HTMLImageElement).src =
							// 		"https://placehold.co/150x150?text=" +
							// 		encodeURIComponent(member.nameJa[0]);
							// }}
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center text-4xl text-white font-bold">
							{member.nameJa[0]}
						</div>
					)}
				</div>
				<h2 className="text-2xl font-bold text-gray-900">{member.nameJa}</h2>
				<p className="text-sm text-gray-500 mb-1">{member.nameEn}</p>
				<span
					className={`px-3 py-1 rounded-full text-xs font-semibold text-white mt-2 ${
						member.partyId === "party_ldp"
							? "bg-red-500"
							: member.partyId === "party_ishin"
								? "bg-green-500"
								: member.partyId === "party_komeito"
									? "bg-yellow-500"
									: "bg-gray-500"
					}`}
				>
					{member.type === "party" ? "政党" : member.role}
				</span>
			</div>

			<div className="space-y-4">
				{member.faction && (
					<div className="bg-slate-50 p-3 rounded-lg">
						<p className="text-xs font-bold text-slate-500 uppercase">
							派閥・グループ
						</p>
						<p className="text-sm text-slate-800">{member.faction}</p>
					</div>
				)}

				<div>
					<p className="text-xs font-bold text-slate-500 uppercase mb-1">
						概要
					</p>
					<p className="text-sm text-gray-700 leading-relaxed">
						{member.description}
					</p>
				</div>

				{member.recentStatements && member.recentStatements.length > 0 && (
					<div>
						<p className="text-xs font-bold text-blue-500 uppercase mb-2">
							最近の主要発言
						</p>
						<ul className="list-disc list-outside pl-4 space-y-1">
							{member.recentStatements.map((t) => (
								<li key={t} className="text-xs text-gray-600 italic">
									"{t}"
								</li>
							))}
						</ul>
					</div>
				)}

				{member.career && member.career.length > 0 && (
					<div>
						<p className="text-xs font-bold text-slate-500 uppercase mb-2">
							経歴
						</p>
						<ul className="list-disc list-outside pl-4 space-y-1">
							{member.career.map((c) => (
								<li key={c} className="text-xs text-gray-600">
									{c}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
};

export default DetailPanel;
