import { useParticipantsContext } from "@/app/providers/participants.provider";
import { Permissions, RoomRole } from "@/app/types/room.types";
import styles from "./ParticipantsList.module.css";
import { useState } from "react";

export function ParticipantsList() {
  const {
    local,
    remote,
    updateUserRole,
    updateRolePermissions,
    waitingGuests,
    approveGuest,
    rejectGuest,
    permissionsMap,
  } = useParticipantsContext();
  const [canShareScreenValue, setCanShareScreenValue] = useState<
    RoomRole | "all"
  >(getPermissionValue("canShareScreen"));

  // helper — варианты выбора
  const roleOptions: { label: string; value: RoomRole | "all" }[] = [
    { label: "Только владелец", value: "owner" },
    { label: "Владелец и админ", value: "admin" },
    { label: "Все", value: "all" },
  ];

  // обработка смены dropdown
  const handlePermissionChange = (
    permission: keyof Permissions,
    value: RoomRole | "all"
  ) => {
    if (value === "all") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, true);
      updateRolePermissions("participant", permission, true);
      setCanShareScreenValue("all");
    } else if (value === "admin") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, true);
      updateRolePermissions("participant", permission, false);
      setCanShareScreenValue("admin");
    } else if (value === "owner") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, false);
      updateRolePermissions("participant", permission, false);
      setCanShareScreenValue("owner");
    }
  };

  function getPermissionValue(permission: keyof Permissions): RoomRole | "all" {
    const ownerHas = permissionsMap["owner"]?.permissions[permission];
    const adminHas = permissionsMap["admin"]?.permissions[permission];
    const participantHas =
      permissionsMap["participant"]?.permissions[permission];

    if (ownerHas && adminHas && participantHas) return "all";
    if (ownerHas && adminHas && !participantHas) return "admin";
    if (ownerHas && !adminHas && !participantHas) return "owner";
    return "owner"; // дефолт
  }

  return (
    <div className={styles.participantsList}>
      {waitingGuests && (
        <>
          <h2>Ожидающие гости</h2>
          <div>
            {waitingGuests.map((guest) => (
              <div key={guest.guestId} className={styles.participantWrapper}>
                <p>{guest.name}</p>
                <button onClick={() => approveGuest(guest.guestId)}>
                  Одобрить
                </button>
                <button onClick={() => rejectGuest(guest.guestId)}>
                  Отклонить
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Участники встречи</h2>
      <div>
        {[local, ...remote].map(({ participant, permissions }) => {
          const role = permissions.role;
          return (
            <div key={participant.sid} className={styles.participantWrapper}>
              <p>{participant.name || participant.identity || "Аноним"}</p>
              <p>Роль: {role}</p>

              {local.permissions.role === "owner" &&
                participant !== local.participant && (
                  <div>
                    <button
                      onClick={() =>
                        updateUserRole(participant.identity, "admin")
                      }
                    >
                      Сделать админом
                    </button>
                    <button
                      onClick={() =>
                        updateUserRole(participant.identity, "participant")
                      }
                    >
                      Сделать участником
                    </button>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Управление правами */}
      {local.permissions.role === "owner" && (
        <div className={styles.permissionsSection}>
          <h2>Права</h2>
          <div className={styles.permissionControl}>
            <label>Может делиться экраном:</label>
            <select
              title="canShareScreen dropdown"
              value={canShareScreenValue}
              onChange={(e) =>
                handlePermissionChange(
                  "canShareScreen",
                  e.target.value as RoomRole | "all"
                )
              }
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* сюда можно добавить другие права аналогично */}
        </div>
      )}
    </div>
  );
}
