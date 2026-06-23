"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type FieldType = "text" | "email" | "url" | "number" | "date" | "textarea" | "select" | "checkbox";

type Option = {
  label: string;
  value: string;
};

type OptionSource = {
  endpoint: string;
  labelKey: string;
  valueKey?: string;
};

export type ResourceField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Option[];
  optionSource?: OptionSource;
  min?: number;
  max?: number;
};

export type ResourceColumn = {
  label: string;
  path: string;
  type?: "date" | "boolean" | "longText";
};

type ResourceManagerProps = {
  title: string;
  description: string;
  apiPath: string;
  fields: ResourceField[];
  columns: ResourceColumn[];
};

type Item = Record<string, unknown> & { id: string };

function valueAt(item: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, item);
}

function inputDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function displayValue(value: unknown, type?: ResourceColumn["type"]) {
  if (type === "boolean") return value ? "是" : "否";
  if (type === "date") return value ? new Intl.DateTimeFormat("zh-CN").format(new Date(String(value))) : "-";
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function emptyForm(fields: ResourceField[]) {
  return fields.reduce<Record<string, string | boolean>>((acc, field) => {
    acc[field.name] = field.type === "checkbox" ? false : "";
    return acc;
  }, {});
}

function placeholderFor(field: ResourceField) {
  if (field.placeholder) return field.placeholder;
  if (field.type === "date") return "请选择日期";
  if (field.type === "number") return `请输入${field.label}，例如：1`;
  return `请输入${field.label}`;
}

export function ResourceManager({ title, description, apiPath, fields, columns }: ResourceManagerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<Record<string, string | boolean>>(() => emptyForm(fields));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceOptions, setSourceOptions] = useState<Record<string, Option[]>>({});

  const relationFields = useMemo(() => fields.filter((field) => field.optionSource), [fields]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiPath, { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { data: Item[] };
      setItems(payload.data);
    } catch {
      setError("读取数据失败，请确认 PostgreSQL 已启动并完成迁移。");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    async function loadOptions() {
      const entries = await Promise.all(
        relationFields.map(async (field) => {
          const source = field.optionSource;
          if (!source) return [field.name, []] as const;
          try {
            const response = await fetch(source.endpoint, { cache: "no-store" });
            if (!response.ok) return [field.name, []] as const;
            const payload = (await response.json()) as { data: Item[] };
            return [
              field.name,
              payload.data.map((item) => ({
                value: String(valueAt(item, source.valueKey ?? "id") ?? ""),
                label: String(valueAt(item, source.labelKey) ?? valueAt(item, "id") ?? ""),
              })),
            ] as const;
          } catch {
            return [field.name, []] as const;
          }
        }),
      );
      setSourceOptions(Object.fromEntries(entries));
    }

    void loadOptions();
  }, [relationFields]);

  function resetForm() {
    setForm(emptyForm(fields));
    setEditingId(null);
  }

  function editItem(item: Item) {
    const next = emptyForm(fields);
    fields.forEach((field) => {
      const value = valueAt(item, field.name);
      if (field.type === "checkbox") {
        next[field.name] = Boolean(value);
      } else if (field.type === "date") {
        next[field.name] = inputDate(value);
      } else if (typeof value === "object" && value !== null) {
        next[field.name] = JSON.stringify(value, null, 2);
      } else {
        next[field.name] = value === null || value === undefined ? "" : String(value);
      }
    });
    setForm(next);
    setEditingId(item.id);
  }

  function payloadFromForm() {
    return fields.reduce<Record<string, unknown>>((acc, field) => {
      const value = form[field.name];
      acc[field.name] = field.type === "number" ? (value === "" ? null : Number(value)) : value;
      return acc;
    }, {});
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editingId ? `${apiPath}/${editingId}` : apiPath, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm()),
      });
      if (!response.ok) throw new Error(await response.text());
      resetForm();
      await loadItems();
    } catch {
      setError("保存失败，请检查必填字段、关联数据和数据库连接。");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!window.confirm("确认删除这条记录？相关子数据可能会被级联删除。")) return;
    setError(null);
    try {
      const response = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      await loadItems();
      if (editingId === id) resetForm();
    } catch {
      setError("删除失败，请确认数据是否存在，或数据库连接是否正常。");
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm font-semibold text-cyan-700">{title}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">GEO AI 搜索可见度监测平台</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </header>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{editingId ? `编辑${title}` : `新增${title}`}</h2>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => {
            const options = field.options ?? sourceOptions[field.name] ?? [];
            const baseClass =
              "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100";

            return (
              <label key={field.name} className={field.type === "textarea" ? "md:col-span-2 xl:col-span-3" : ""}>
                <span className="text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required ? <span className="text-red-600"> *</span> : null}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    className={`${baseClass} min-h-24 resize-y`}
                    required={field.required}
                    placeholder={placeholderFor(field)}
                    value={String(form[field.name] ?? "")}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                ) : field.type === "select" ? (
                  <select
                    className={baseClass}
                    required={field.required}
                    value={String(form[field.name] ?? "")}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                  >
                    <option value="">{`请选择${field.label}`}</option>
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <span className="mt-2 flex h-10 items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-cyan-700"
                      checked={Boolean(form[field.name])}
                      onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.checked }))}
                    />
                    <span className="text-sm text-slate-600">启用</span>
                  </span>
                ) : (
                  <input
                    className={baseClass}
                    type={field.type}
                    min={field.min}
                    max={field.max}
                    required={field.required}
                    placeholder={placeholderFor(field)}
                    value={String(form[field.name] ?? "")}
                    onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                )}
              </label>
            );
          })}
          <div className="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : editingId ? "保存修改" : "创建"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消编辑
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{title}列表</h2>
          <span className="text-sm text-slate-500">{items.length} 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.path} className="px-5 py-3 font-semibold">
                    {column.label}
                  </th>
                ))}
                <th className="px-5 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-5 py-8 text-slate-500" colSpan={columns.length + 1}>
                    正在读取数据...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-slate-500" colSpan={columns.length + 1}>
                    暂无数据。
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    {columns.map((column) => {
                      const text = displayValue(valueAt(item, column.path), column.type);
                      return (
                        <td
                          key={column.path}
                          className={`px-5 py-4 align-top text-slate-700 ${column.type === "longText" ? "max-w-xl" : ""}`}
                        >
                          <span className={column.type === "longText" ? "line-clamp-2 whitespace-pre-wrap" : ""}>{text}</span>
                        </td>
                      );
                    })}
                    <td className="px-5 py-4 align-top">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editItem(item)}
                          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
