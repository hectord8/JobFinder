import { savePreferences } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const pref = await prisma.preference.findUnique({ where: { userId } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preferences</h1>
        <p className="text-sm text-gray-500">
          These drive which jobs get fetched and how they&apos;re scored.
        </p>
      </div>

      <form action={savePreferences} className="card space-y-5">
        <div>
          <label className="label" htmlFor="targetRoles">
            Target roles
          </label>
          <textarea
            id="targetRoles"
            name="targetRoles"
            rows={3}
            className="input"
            placeholder="Software Engineer Graduate, Internship, Cyber Security Graduate"
            defaultValue={pref?.targetRoles.join(", ") ?? ""}
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma or newline separated. One provider search runs per role.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="keywords">
            Keywords
          </label>
          <textarea
            id="keywords"
            name="keywords"
            rows={2}
            className="input"
            placeholder="python, react, aws"
            defaultValue={pref?.keywords.join(", ") ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="fields">
            Fields of interest
          </label>
          <input
            id="fields"
            name="fields"
            className="input"
            placeholder="Computer Science, Software Engineering, Cyber Security"
            defaultValue={pref?.fields.join(", ") ?? ""}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              name="location"
              className="input"
              placeholder="London"
              defaultValue={pref?.location ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="countryCode">
              Country code
            </label>
            <input
              id="countryCode"
              name="countryCode"
              className="input"
              placeholder="gb"
              defaultValue={pref?.countryCode ?? "gb"}
            />
            <p className="mt-1 text-xs text-gray-500">
              ISO code used by Adzuna/JSearch (gb, us, de…).
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="seniority">
              Seniority
            </label>
            <select
              id="seniority"
              name="seniority"
              className="input"
              defaultValue={pref?.seniority ?? ""}
            >
              <option value="">Any</option>
              <option value="intern">Intern</option>
              <option value="grad">Graduate</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="minMatchScore">
              Minimum match %
            </label>
            <input
              id="minMatchScore"
              name="minMatchScore"
              type="number"
              min={0}
              max={100}
              className="input"
              defaultValue={pref?.minMatchScore ?? 0}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="remoteOnly"
            defaultChecked={pref?.remoteOnly ?? false}
          />
          Remote only
        </label>

        <SubmitButton>Save preferences</SubmitButton>
      </form>
    </div>
  );
}
