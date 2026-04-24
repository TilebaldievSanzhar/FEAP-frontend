import type { Meta, StoryObj } from "@storybook/react";
import { JobProgressBar } from "./JobProgressBar";
import type { Job } from "@/api/types";

function makeJob(patch: Partial<Job["progress"]> & { status?: Job["status"] } = {}): Job {
  const { status = "running", ...progress } = patch;
  return {
    job_id: "cls-demo",
    job_type: "classify_batch",
    status,
    created_at: new Date().toISOString(),
    progress: {
      total: 30,
      completed: 16,
      failed: 0,
      needs_input: 2,
      running: 8,
      pending: 4,
      ...progress,
    },
  };
}

const meta: Meta<typeof JobProgressBar> = {
  title: "Jobs/JobProgressBar",
  component: JobProgressBar,
};

export default meta;

type Story = StoryObj<typeof JobProgressBar>;

export const Running: Story = {
  args: { job: makeJob() },
};

export const NeedsInput: Story = {
  args: {
    job: makeJob({
      status: "needs_input",
      completed: 20,
      running: 0,
      pending: 0,
      needs_input: 10,
    }),
  },
};

export const Partial: Story = {
  args: {
    job: makeJob({
      status: "partial",
      completed: 25,
      failed: 5,
      running: 0,
      pending: 0,
      needs_input: 0,
    }),
  },
};

export const Completed: Story = {
  args: {
    job: makeJob({
      status: "completed",
      completed: 30,
      failed: 0,
      running: 0,
      pending: 0,
      needs_input: 0,
    }),
  },
};
