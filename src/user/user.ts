import * as Sentry from "@sentry/node";

export interface User {
  uid: number;
  gid: number;
  free: boolean;
  username: string;
}

export class SystemUsers {
  users: User[];
  constructor(start: number, stop: number, defaultGroup: number) {
    if (start > stop) {
      throw new TypeError("Invalid user range");
    }

    this.users = [];
    for (let i = start; i <= stop; i++) {
      this.users.push({
        uid: i,
        gid: defaultGroup,
        free: true,
        username: `code_executor_${i}`,
      });
    }
  }

  public async acquireUntilAvailable(): Promise<User | null> {
    const maxRetries = 5;
    const retryInterval = 3000; // 3 seconds
    let attempts = 0;

    while (attempts < maxRetries) {
      const user = this.acquire();

      if (user) {
        return user;
      }

      attempts++;

      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    return null;
  }

  public acquire(): User | null {
    const span = Sentry.getCurrentHub()?.getScope()?.getSpan()?.startChild({
      op: "system_users.acquire",
    });

    const userIndex = this.users.findIndex((u) => u.free);
    if (userIndex !== -1) {
      const user = this.users[userIndex];
      this.users[userIndex].free = false;
      span?.finish();
      return user;
    }

    span?.finish();
    return null;
  }

  public release(uid: number): void {
    const span = Sentry.getCurrentHub()?.getScope()?.getSpan()?.startChild({
      op: "system_users.release",
    });

    const userIndex = this.users.findIndex((u) => u.uid === uid);
    if (userIndex !== -1) {
      this.users[userIndex].free = true;
    }

    span?.finish();
  }
}
