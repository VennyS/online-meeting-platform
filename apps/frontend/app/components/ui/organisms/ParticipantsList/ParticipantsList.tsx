import { useParticipantsContext } from "@/app/providers/participants.provider";
import { Permissions, RoomRole } from "@/app/types/room.types";
import styles from "./ParticipantsList.module.css";
import { useState, useEffect } from "react";

export function ParticipantsList({
  roomId,
  roomName,
}: {
  roomId: string;
  roomName: string;
}) {
  const {
    local,
    remote,
    waitingGuests,
    permissionsMap,
    updateUserRole,
    updateRolePermissions,
    approveGuest,
    rejectGuest,
    addToBlackList,
  } = useParticipantsContext();
  const [canShareScreenValue, setCanShareScreenValue] = useState<
    RoomRole | "all"
  >(getPermissionValue("canShareScreen"));
  const [canStartPresentationValue, setCanStartPresentationValue] = useState<
    RoomRole | "all"
  >(getPermissionValue("canStartPresentation"));
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем, что все роли присутствуют в permissionsMap
    if (
      permissionsMap.owner &&
      permissionsMap.admin &&
      permissionsMap.participant
    ) {
      const shareScreenValue = getPermissionValue("canShareScreen");
      const startPresentationValue = getPermissionValue("canStartPresentation");
      setCanShareScreenValue(shareScreenValue);
      setCanStartPresentationValue(startPresentationValue);
    }
  }, [permissionsMap]);

  const generateMeetingInfo = () => {
    const meetingDate = new Date().toLocaleString("ru-RU", {
      timeZone: "Europe/Moscow",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const meetingLink = `${window.location.origin}/room/${roomId}`;

    return `Встреча: ${roomName}
Дата: ${meetingDate} (Москва)
Подключиться: ${meetingLink}`;
  };

  const handleCopy = async () => {
    const text = generateMeetingInfo();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Не удалось скопировать:", err);
      setManualText(text);
    }
  };

  // helper — варианты выбора
  const roleOptions: { label: string; value: RoomRole | "all" }[] = [
    { label: "Только владелец", value: "owner" },
    { label: "Владелец и админ", value: "admin" },
    { label: "Все", value: "all" },
  ];

  // обработка смены dropdown
  const handlePermissionChange = (
    permission: keyof Permissions,
    value: RoomRole | "all",
    set: (role: RoomRole | "all") => void
  ) => {
    if (value === "all") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, true);
      updateRolePermissions("participant", permission, true);
      set("all");
    } else if (value === "admin") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, true);
      updateRolePermissions("participant", permission, false);
      set("admin");
    } else if (value === "owner") {
      updateRolePermissions("owner", permission, true);
      updateRolePermissions("admin", permission, false);
      updateRolePermissions("participant", permission, false);
      set("owner");
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
    return "owner";
  }

  return (
    <div className={styles.participantsList}>
      <button onClick={handleCopy}>Поделиться встречей</button>

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
                    <button
                      onClick={() => {
                        addToBlackList(
                          participant.identity,
                          participant.name || "unkown"
                        );
                      }}
                    >
                      Исключить
                    </button>
                  </div>
                )}
            </div>
          );
        })}

        <details>
          <summary>Чёрный список</summary>
        </details>
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
                  e.target.value as RoomRole | "all",
                  setCanShareScreenValue
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

          <div className={styles.permissionControl}>
            <label>Может делиться презентацией:</label>
            <select
              title="canStartPresentation dropdown"
              value={canStartPresentationValue}
              onChange={(e) =>
                handlePermissionChange(
                  "canStartPresentation",
                  e.target.value as RoomRole | "all",
                  setCanStartPresentationValue
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

      {copied && (
        <div className={styles.copiedToast}>Скопировано в буфер обмена</div>
      )}
      {manualText && (
        <div className={styles.manualCopy}>
          <div>Не удалось скопировать. Скопируйте вручную:</div>
          <textarea
            readOnly
            value={manualText}
            className={styles.manualTextarea}
          />
        </div>
      )}
    </div>
  );
}
