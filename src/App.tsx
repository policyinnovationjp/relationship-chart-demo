import { useState } from "react";
import DetailPanel from "./components/DetailPanel";
import Graph from "./components/Graph";
import type { MemberDetail } from "./types";

const App = () => {
	const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(
		null,
	);

	return (
		<div className="flex flex-col lg:flex-row h-full w-full overflow-hidden absolute inset-0">
			<div className="flex-1 h-[60vh] lg:h-full relative order-1">
				<Graph onSelectMember={setSelectedMember} />
			</div>
			<div className="w-full lg:w-[380px] h-[40vh] lg:h-full bg-white shadow-xl z-20 order-2 overflow-hidden transition-all">
				<DetailPanel member={selectedMember} />
			</div>
		</div>
	);
};

export default App;
