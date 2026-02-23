from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum


class AssetType(str, Enum):
    MEDICAL_DEVICE = "Medical Device"
    CONSUMABLE = "Consumable"
    FIXED_ASSET = "Fixed Asset"


class VehicleStatus(str, Enum):
    ACTIVE = "Active"
    MAINTENANCE = "Maintenance"
    DISPATCHED = "Dispatched"


class RequestStatus(str, Enum):
    PENDING = "Pending"
    CLINICALLY_APPROVED = "Clinically Approved"
    FULFILLED = "Fulfilled"


class StaffRole(str, Enum):
    PARAMEDIC = "Paramedic"
    DRIVER = "Driver"
    INVENTORY_MANAGER = "Inventory Manager"


@dataclass
class MaintenanceRecord:
    service_date: date
    notes: str = ""


@dataclass
class InventoryItem:
    item_id: str
    name: str
    asset_type: AssetType
    quantity: int
    serial_number: str | None = None
    maintenance_history: list[MaintenanceRecord] = field(default_factory=list)
    expiration_date: date | None = None
    calibration_due_date: date | None = None


@dataclass
class AmbulanceVehicle:
    vehicle_id: str
    status: VehicleStatus = VehicleStatus.ACTIVE
    assigned_equipment_item_ids: list[str] = field(default_factory=list)
    oxygen_level_percent: float = 100.0
    fuel_level_percent: float = 100.0


@dataclass
class ApprovalRequest:
    request_id: str
    request_type: str
    requested_by: str
    status: RequestStatus = RequestStatus.PENDING
    clinically_approved_by: str | None = None
    fulfilled_by: str | None = None


@dataclass
class StaffMember:
    staff_id: str
    name: str
    role: StaffRole
    assigned_shift: str | None = None
    assigned_vehicle_id: str | None = None


@dataclass
class StockChecklistEntry:
    item_id: str
    counted_quantity: int


class MedicalSupplyChainPlatform:
    def __init__(self) -> None:
        self.inventory_items: dict[str, InventoryItem] = {}
        self.ambulances: dict[str, AmbulanceVehicle] = {}
        self.approval_requests: dict[str, ApprovalRequest] = {}
        self.staff_members: dict[str, StaffMember] = {}

    def add_inventory_item(self, item: InventoryItem) -> None:
        self.inventory_items[item.item_id] = item

    def register_ambulance(self, ambulance: AmbulanceVehicle) -> None:
        self.ambulances[ambulance.vehicle_id] = ambulance

    def assign_equipment_to_ambulance(self, vehicle_id: str, item_id: str) -> None:
        if vehicle_id not in self.ambulances:
            raise KeyError(f"Vehicle not found: {vehicle_id}")
        if item_id not in self.inventory_items:
            raise KeyError(f"Inventory item not found: {item_id}")
        self.ambulances[vehicle_id].assigned_equipment_item_ids.append(item_id)

    def update_ambulance_levels(
        self, vehicle_id: str, oxygen_level_percent: float, fuel_level_percent: float
    ) -> None:
        if vehicle_id not in self.ambulances:
            raise KeyError(f"Vehicle not found: {vehicle_id}")
        vehicle = self.ambulances[vehicle_id]
        vehicle.oxygen_level_percent = oxygen_level_percent
        vehicle.fuel_level_percent = fuel_level_percent

    def create_approval_request(self, request: ApprovalRequest) -> None:
        self.approval_requests[request.request_id] = request

    def clinically_approve_request(self, request_id: str, approver: str) -> None:
        request = self.approval_requests[request_id]
        if request.status != RequestStatus.PENDING:
            raise ValueError("Only pending requests can be clinically approved.")
        request.status = RequestStatus.CLINICALLY_APPROVED
        request.clinically_approved_by = approver

    def fulfill_request(self, request_id: str, fulfiller: str) -> None:
        request = self.approval_requests[request_id]
        if request.status != RequestStatus.CLINICALLY_APPROVED:
            raise ValueError("Only clinically approved requests can be fulfilled.")
        request.status = RequestStatus.FULFILLED
        request.fulfilled_by = fulfiller

    def add_staff_member(self, staff_member: StaffMember) -> None:
        self.staff_members[staff_member.staff_id] = staff_member

    def assign_staff(self, staff_id: str, shift: str, vehicle_id: str | None = None) -> None:
        staff = self.staff_members[staff_id]
        if vehicle_id is not None and vehicle_id not in self.ambulances:
            raise KeyError(f"Vehicle not found: {vehicle_id}")
        staff.assigned_shift = shift
        staff.assigned_vehicle_id = vehicle_id

    def run_stock_take(self, entries: list[StockChecklistEntry]) -> dict[str, dict[str, int]]:
        discrepancies: dict[str, dict[str, int]] = {}
        for entry in entries:
            if entry.item_id not in self.inventory_items:
                raise KeyError(f"Inventory item not found: {entry.item_id}")
            item = self.inventory_items[entry.item_id]
            if item.quantity != entry.counted_quantity:
                discrepancies[entry.item_id] = {
                    "system_quantity": item.quantity,
                    "counted_quantity": entry.counted_quantity,
                }
                item.quantity = entry.counted_quantity
        return discrepancies
