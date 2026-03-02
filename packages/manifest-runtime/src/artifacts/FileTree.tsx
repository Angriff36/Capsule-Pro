import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  Folder,
} from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "./zipExporter";

interface FileTreeProps {
  files: Record<string, string>;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeStructure {
  [key: string]: TreeStructure | string;
}

function buildTree(files: Record<string, string>): TreeStructure {
  const tree: TreeStructure = {};

  for (const path of Object.keys(files)) {
    const parts = path.split("/");
    let current = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as TreeStructure;
    }

    current[parts.at(-1)] = path;
  }

  return tree;
}

function TreeFolder({
  name,
  children,
  files,
  selectedFile,
  onSelectFile,
  depth,
}: {
  name: string;
  children: TreeStructure;
  files: Record<string, string>;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        className="flex items-center gap-2 w-full px-2 py-1 hover:bg-gray-800 rounded text-sm text-gray-300"
        onClick={() => setOpen(!open)}
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        {open ? (
          <ChevronDown className="text-gray-500" size={14} />
        ) : (
          <ChevronRight className="text-gray-500" size={14} />
        )}
        <Folder className="text-amber-400" size={14} />
        <span>{name}</span>
      </button>
      {open && (
        <div>
          {Object.entries(children).map(([key, value]) => {
            if (typeof value === "string") {
              return (
                <TreeFile
                  content={files[value]}
                  depth={depth + 1}
                  key={key}
                  name={key}
                  onSelect={onSelectFile}
                  path={value}
                  selected={selectedFile === value}
                />
              );
            }
            return (
              <TreeFolder
                children={value}
                depth={depth + 1}
                files={files}
                key={key}
                name={key}
                onSelectFile={onSelectFile}
                selectedFile={selectedFile}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TreeFile({
  name,
  path,
  content,
  selected,
  onSelect,
  depth,
}: {
  name: string;
  path: string;
  content: string;
  selected: boolean;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = () => {
    if (name.endsWith(".ts")) {
      return "text-sky-400";
    }
    if (name.endsWith(".json")) {
      return "text-amber-400";
    }
    if (name.endsWith(".md")) {
      return "text-emerald-400";
    }
    if (name.endsWith(".manifest")) {
      return "text-purple-400";
    }
    return "text-gray-400";
  };

  return (
    <button
      className={`flex items-center gap-2 w-full px-2 py-1 rounded text-sm group ${
        selected
          ? "bg-sky-500/20 text-sky-300"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
      }`}
      onClick={() => onSelect(path)}
      style={{ paddingLeft: depth * 12 + 8 }}
    >
      <File className={getFileIcon()} size={14} />
      <span className="flex-1 text-left truncate">{name}</span>
      <button
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
        onClick={handleCopy}
        title="Copy file contents"
      >
        {copied ? (
          <Check className="text-emerald-400" size={12} />
        ) : (
          <Copy size={12} />
        )}
      </button>
    </button>
  );
}

export function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  const tree = buildTree(files);

  return (
    <div className="py-2">
      {Object.entries(tree).map(([key, value]) => {
        if (typeof value === "string") {
          return (
            <TreeFile
              content={files[value]}
              depth={0}
              key={key}
              name={key}
              onSelect={onSelectFile}
              path={value}
              selected={selectedFile === value}
            />
          );
        }
        return (
          <TreeFolder
            children={value}
            depth={0}
            files={files}
            key={key}
            name={key}
            onSelectFile={onSelectFile}
            selectedFile={selectedFile}
          />
        );
      })}
    </div>
  );
}
