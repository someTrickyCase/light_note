// =====================================================================
// STATE · PROVIDER
// =====================================================================

import { createContext, useContext, useEffect, useReducer } from "react";
import { projectReducer } from "./reducer.js";
import { storage } from "./storage.js";

const ProjectContext = createContext(null);
const DispatchContext = createContext(null);

export function ProjectProvider({ children }) {
  const [project, dispatch] = useReducer(projectReducer, null, storage.load);

  useEffect(() => {
    storage.save(project);
  }, [project]);

  return (
    <ProjectContext.Provider value={project}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </ProjectContext.Provider>
  );
}

export const useProject = () => useContext(ProjectContext);
export const useDispatch = () => useContext(DispatchContext);
