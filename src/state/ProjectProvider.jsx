// =====================================================================
// STATE · PROVIDER
// =====================================================================

import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import { projectReducer } from "./reducer.js";
import { storage } from "./storage.js";

const ProjectContext = createContext(null);
const DispatchContext = createContext(null);
const LoadingContext = createContext(false);

export function ProjectProvider({ children }) {
	const [project, dispatch] = useReducer(projectReducer, null, () => null);
	const [ready, setReady] = useState(false);

	// Первая загрузка — async (IDB resolve)
	useEffect(() => {
		let alive = true;
		storage.load().then((p) => {
			if (!alive) return;
			dispatch({ type: "REPLACE", project: p });
			setReady(true);
		});
		return () => { alive = false; };
	}, []);

	// Каждое изменение после ready — save. Не сохраняем во время первичной загрузки,
	// чтобы не зациклиться (REPLACE → save → load → ...).
	const firstSaveRef = useRef(true);
	useEffect(() => {
		if (!ready) return;
		if (firstSaveRef.current) { firstSaveRef.current = false; return; }
		storage.save(project);
	}, [project, ready]);

	return (
		<LoadingContext.Provider value={!ready}>
			<ProjectContext.Provider value={project}>
				<DispatchContext.Provider value={dispatch}>
					{children}
				</DispatchContext.Provider>
			</ProjectContext.Provider>
		</LoadingContext.Provider>
	);
}

export const useProject = () => {
	const p = useContext(ProjectContext);
	// На время асинхронной IDB-загрузки проект = null.
	// Возвращаем пустой проект как fallback, чтобы компоненты
	// не падали на обращениях к p.meta/p.fixtures/etc.
	return p || emptyProjectPlaceholder;
};

// мемоизированный пустой проект, чтобы ссылка была стабильной между рендерами
import { emptyProject } from "./model.js";
const emptyProjectPlaceholder = emptyProject();
export const useDispatch = () => useContext(DispatchContext);
export const useProjectLoading = () => useContext(LoadingContext);
