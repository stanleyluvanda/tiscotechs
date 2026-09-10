import React from "react";

function initials(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    ((parts[0]?.[0] || "L") + (parts[1]?.[0] || ""))
      .toUpperCase()
  );
}

function LecturerAvatar({ photoUrl, name, size = "lg" }) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10"
      : size === "md"
      ? "h-14 w-14"
      : "h-20 w-20";

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-slate-200 flex items-center justify-center`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name || "Lecturer"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-slate-600">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

function CountryFlag({ countryCode = "", country = "" }) {
  const code = String(countryCode || "").trim().toLowerCase();

  if (!code || code.length !== 2) {
    return <span>{country}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt={country ? `${country} flag` : "Country flag"}
        className="h-4 w-6 rounded-[2px] object-cover"
        loading="lazy"
      />
      <span>{country}</span>
    </span>
  );
}

export default function LecturerMiniProfile({
  lecturer = {},
  compact = false,
  onClose,
}) {
  const mini = lecturer?.lecturerMiniProfile || {};

  const courses = Array.isArray(mini.courses) ? mini.courses : [];
  const education = Array.isArray(mini.education) ? mini.education : [];
  const consultationHours = Array.isArray(mini.consultationHours)
    ? mini.consultationHours
    : [];

  const photoUrl =
    lecturer.authorPhoto ||
    lecturer.photoUrl ||
    lecturer.avatarUrl ||
    "";

  const name =
    lecturer.author ||
    lecturer.authorName ||
    lecturer.name ||
    "Lecturer";

  const university =
    lecturer.authorUniversity ||
    lecturer.university ||
    "";

  const faculty =
    lecturer.authorFaculty ||
    lecturer.faculty ||
    "";

  const country =
    lecturer.authorCountry ||
    lecturer.country ||
    "";

  const countryCode =
    lecturer.authorCountryCode ||
    lecturer.countryCode ||
    "";

  if (compact) {
    return (
      <div className="w-[310px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <LecturerAvatar
            photoUrl={photoUrl}
            name={name}
            size="md"
          />

          <div className="min-w-0">
            <div className="font-semibold text-slate-900">
              {name}
            </div>

            {university && (
              <div className="mt-0.5 text-xs text-slate-600">
                {university}
              </div>
            )}

            {faculty && (
              <div className="text-xs text-slate-600">
                {faculty}
              </div>
            )}

            {country && (
              <div className="mt-1 text-xs text-slate-600">
                <CountryFlag
                  country={country}
                  countryCode={countryCode}
                />
              </div>
            )}
          </div>
        </div>

        {courses.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="text-xs font-semibold text-slate-800">
              Courses taught
            </div>

            <div className="mt-1 text-xs text-slate-600">
              {courses.slice(0, 3).join(" • ")}
            </div>
          </div>
        )}

        {consultationHours.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-800">
              Consultation
            </div>

            <div className="mt-1 text-xs text-slate-600">
              {consultationHours[0]?.day}
              {consultationHours[0]?.from
                ? ` • ${consultationHours[0].from}`
                : ""}
              {consultationHours[0]?.to
                ? ` – ${consultationHours[0].to}`
                : ""}
            </div>
          </div>
        )}

        <div className="mt-3 text-xs font-medium text-blue-600">
          Click to view full profile
        </div>
      </div>
    );
  }

  return (
  <div className="relative w-full max-w-2xl max-h-[calc(100vh-220px)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          aria-label="Close profile"
        >
          ×
        </button>
      )}

      <div className="p-5 pr-7 sm:p-6 sm:pr-8">
        <div className="flex items-start gap-4 pr-8">
          <LecturerAvatar
            photoUrl={photoUrl}
            name={name}
          />

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">
              {name}
            </h2>

            {university && (
              <div className="mt-1 text-sm text-slate-700">
                {university}
              </div>
            )}

            {faculty && (
              <div className="text-sm text-slate-700">
                {faculty}
              </div>
            )}

            {country && (
              <div className="mt-2 text-sm text-slate-600">
                <CountryFlag
                  country={country}
                  countryCode={countryCode}
                />
              </div>
            )}
          </div>
        </div>

        {courses.length > 0 && (
          <section className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Courses taught
            </h3>

            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {courses.map((course, index) => (
                <li key={`${course}-${index}`}>
                  {course}
                </li>
              ))}
            </ul>
          </section>
        )}

        {consultationHours.length > 0 && (
          <section className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Students'consultation hours
            </h3>

            <div className="mt-2 space-y-1.5">
              {consultationHours.map((slot, index) => (
                <div
                  key={`${slot.day}-${index}`}
                  className="flex justify-between gap-4 text-sm text-slate-700"
                >
                  <span className="font-medium">
                    {slot.day}
                  </span>

                  <span>
                    {slot.from}
                    {slot.from && slot.to ? " – " : ""}
                    {slot.to}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(mini.officeBuilding || mini.officeRoom) && (
  <section className="mt-5 border-t border-slate-100 pt-4">
    <h3 className="text-sm font-semibold text-slate-900">
      Office
    </h3>

    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
      <div>
        <div className="font-semibold text-slate-800">
          Building
        </div>

        {mini.officeBuilding && (
          <div className="mt-1 text-slate-700">
            {mini.officeBuilding}
          </div>
        )}
      </div>

      <div>
        <div className="font-semibold text-slate-800">
          Office/Room
        </div>

        {mini.officeRoom && (
          <div className="mt-1 text-slate-700">
            {mini.officeRoom}
          </div>
        )}
      </div>
    </div>
  </section>
)}

        {education.length > 0 && (
          <section className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Education
            </h3>

            <div className="mt-2 space-y-2">
  {education.map((item, index) => (
    <div
      key={index}
      className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-x-6 gap-y-1"
    >
      <div className="text-sm font-medium text-slate-800">
        {item.degree}
      </div>

      {item.institution && (
        <div className="text-sm text-slate-600">
          {item.institution}
        </div>
      )}
    </div>
  ))}
</div>
          </section>
        )}
      </div>
    </div>
  );
}