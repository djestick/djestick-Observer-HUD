import {
  useEffect,
  useState,
  createContext,
  ReactNode,
  useContext,
} from "react";
import ActionManager, { ActionHandler, ConfigManager } from "./managers";
import { GSI } from "../HUD";
import type {
  AllActions,
  AllInputs,
  GetInputsFromSection,
  Sections,
} from "./settings";

export const actions = new ActionManager();
export const configs = new ConfigManager();

type BaseEvents = string;

export function useAction<T extends keyof AllActions>(
  action: T,
  callback: ActionHandler<T extends keyof AllActions ? AllActions[T] : never>,
  deps?: React.DependencyList
) {
  useEffect(
    () => {
      actions.on(action, callback);
      return () => {
        actions.off(action, callback);
      };
    },
    deps ? [action, ...deps] : [action, callback]
  );
  return null;
}
export function useOnConfigChange<K extends keyof Sections, T = any>(
  section: K,
  callback: ActionHandler<
    | {
        [L in keyof (K extends keyof Sections
          ? GetInputsFromSection<Sections[K]>
          : T)]?: (K extends keyof Sections
          ? GetInputsFromSection<Sections[K]>
          : T)[L];
      }
    | null
  >,
  deps?: React.DependencyList
) {
  useEffect(
    () => {
      const onDataChanged = (data: any) => {
        callback(data?.[section] || null);
      };

      configs.onChange(onDataChanged);
      onDataChanged(configs.data);

      return () => {
        configs.off(onDataChanged);
      };
    },
    deps ? [section, ...deps] : [section, callback]
  );

  return null;
}

export function ONGSI<T extends (...args: any[]) => void>(
  event: BaseEvents,
  callback: T,
  deps?: React.DependencyList
) {
  useEffect(
    () => {
      GSI.on(event, callback as (...args: any[]) => void);

      return () => {
        GSI.off(event, callback as (...args: any[]) => void);
      };
    },
    deps ? [event, ...deps] : [event, callback]
  );
}

const SettingsContext = createContext<AllInputs | null>({} as AllInputs);
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AllInputs | null>(
    (configs.data as AllInputs) || null
  );

  useEffect(() => {
    const onDataChanged = (data: any) => {
      setData(data);
    };

    configs.onChange(onDataChanged);
    onDataChanged(configs.data);

    return () => {
      configs.off(onDataChanged);
    };
  }, []);

  return (
    <SettingsContext.Provider value={data}>{children}</SettingsContext.Provider>
  );
};

export function useConfig<K extends keyof Sections>(section: K) {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("generic Hook must be used within a Generic Provider");
  }
  return context?.[section];
}
