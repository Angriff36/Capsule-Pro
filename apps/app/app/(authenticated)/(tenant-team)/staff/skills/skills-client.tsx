"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { staffEmployeeSkills, staffSkills } from "@/app/lib/routes";

interface Skill {
  category: string | null;
  id: string;
  name: string;
}

interface EmployeeSkillRow {
  employeeId: string;
  employeeName: string | null;
  proficiencyLevel: number;
  skillId: string;
  skillName: string;
}

interface EmployeeOption {
  id: string;
  label: string;
}

interface SkillsClientProps {
  employees: EmployeeOption[];
}

export function SkillsClient({ employees }: SkillsClientProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [rows, setRows] = useState<EmployeeSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSkillName, setNewSkillName] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignSkillId, setAssignSkillId] = useState("");
  const [assignLevel, setAssignLevel] = useState("3");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [skillsRes, assignRes] = await Promise.all([
        apiFetch(staffSkills()),
        apiFetch(staffEmployeeSkills()),
      ]);
      if (!(skillsRes.ok && assignRes.ok)) {
        throw new Error("load failed");
      }
      const skillsJson = (await skillsRes.json()) as { skills: Skill[] };
      const assignJson = (await assignRes.json()) as {
        employeeSkills: EmployeeSkillRow[];
      };
      setSkills(skillsJson.skills);
      setRows(assignJson.employeeSkills);
    } catch {
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createSkill = async () => {
    if (!newSkillName.trim()) {
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(staffSkills(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSkillName.trim() }),
      });
      if (!res.ok) {
        throw new Error("create failed");
      }
      setNewSkillName("");
      await load();
      toast.success("Skill created");
    } catch {
      toast.error("Failed to create skill");
    } finally {
      setSaving(false);
    }
  };

  const assignSkill = async () => {
    if (!(assignEmployeeId && assignSkillId)) {
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(staffEmployeeSkills(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: assignEmployeeId,
          skillId: assignSkillId,
          proficiencyLevel: Number(assignLevel),
        }),
      });
      if (!res.ok) {
        throw new Error("assign failed");
      }
      await load();
      toast.success("Skill assigned");
    } catch {
      toast.error("Failed to assign skill");
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (employeeId: string, skillId: string) => {
    const params = new URLSearchParams({ employeeId, skillId });
    const res = await apiFetch(staffEmployeeSkills(params), {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove assignment");
      return;
    }
    await load();
    toast.success("Assignment removed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">Employee Skills</h1>
        <p className="text-muted-foreground text-sm">
          Track proficiency levels used by scheduling optimization and
          auto-assignment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill catalog</CardTitle>
            <CardDescription>Tenant-wide skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="New skill name"
                value={newSkillName}
              />
              <Button disabled={saving} onClick={createSkill}>
                <Plus className="mr-1 size-4" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s.id} variant="outline">
                  {s.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign skill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Employee</Label>
              <Select
                onValueChange={setAssignEmployeeId}
                value={assignEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Skill</Label>
              <Select onValueChange={setAssignSkillId} value={assignSkillId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Proficiency (1–5)</Label>
              <Select onValueChange={setAssignLevel} value={assignLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={saving} onClick={assignSkill}>
              Assign
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead>Level</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.employeeId}-${row.skillId}`}>
                  <TableCell>{row.employeeName ?? row.employeeId}</TableCell>
                  <TableCell>{row.skillName}</TableCell>
                  <TableCell>{row.proficiencyLevel}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() =>
                        removeAssignment(row.employeeId, row.skillId)
                      }
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
