from datetime import date
import unittest

from supply_chain_platform import (
    AmbulanceVehicle,
    ApprovalRequest,
    AssetType,
    InventoryItem,
    MaintenanceRecord,
    MedicalSupplyChainPlatform,
    RequestStatus,
    StaffMember,
    StaffRole,
    StockChecklistEntry,
    VehicleStatus,
)


class MedicalSupplyChainPlatformTests(unittest.TestCase):
    def setUp(self) -> None:
        self.platform = MedicalSupplyChainPlatform()

    def test_inventory_and_equipment_fields(self) -> None:
        item = InventoryItem(
            item_id="item-1",
            name="Defibrillator",
            asset_type=AssetType.MEDICAL_DEVICE,
            quantity=1,
            serial_number="SN-1001",
            maintenance_history=[MaintenanceRecord(service_date=date(2026, 1, 1), notes="Inspected")],
            calibration_due_date=date(2026, 12, 31),
        )
        self.platform.add_inventory_item(item)
        self.assertEqual(self.platform.inventory_items["item-1"].serial_number, "SN-1001")
        self.assertEqual(len(self.platform.inventory_items["item-1"].maintenance_history), 1)
        self.assertEqual(
            self.platform.inventory_items["item-1"].calibration_due_date, date(2026, 12, 31)
        )

    def test_ambulance_fleet_status_assignment_and_levels(self) -> None:
        self.platform.add_inventory_item(
            InventoryItem(
                item_id="item-2",
                name="Oxygen Kit",
                asset_type=AssetType.CONSUMABLE,
                quantity=5,
                expiration_date=date(2026, 10, 1),
            )
        )
        self.platform.register_ambulance(
            AmbulanceVehicle(vehicle_id="amb-1", status=VehicleStatus.MAINTENANCE)
        )
        self.platform.assign_equipment_to_ambulance("amb-1", "item-2")
        self.platform.update_ambulance_levels("amb-1", oxygen_level_percent=72.5, fuel_level_percent=60.0)

        amb = self.platform.ambulances["amb-1"]
        self.assertEqual(amb.status, VehicleStatus.MAINTENANCE)
        self.assertEqual(amb.assigned_equipment_item_ids, ["item-2"])
        self.assertEqual(amb.oxygen_level_percent, 72.5)
        self.assertEqual(amb.fuel_level_percent, 60.0)

    def test_approval_engine_status_flow(self) -> None:
        self.platform.create_approval_request(
            ApprovalRequest(request_id="req-1", request_type="Procurement", requested_by="manager-a")
        )
        self.platform.clinically_approve_request("req-1", approver="clinician-b")
        self.platform.fulfill_request("req-1", fulfiller="inventory-c")

        req = self.platform.approval_requests["req-1"]
        self.assertEqual(req.status, RequestStatus.FULFILLED)
        self.assertEqual(req.clinically_approved_by, "clinician-b")
        self.assertEqual(req.fulfilled_by, "inventory-c")

    def test_staff_assignment_to_shift_and_vehicle(self) -> None:
        self.platform.register_ambulance(AmbulanceVehicle(vehicle_id="amb-2", status=VehicleStatus.ACTIVE))
        self.platform.add_staff_member(
            StaffMember(staff_id="staff-1", name="Alex Driver", role=StaffRole.DRIVER)
        )
        self.platform.assign_staff("staff-1", shift="Night Shift", vehicle_id="amb-2")

        staff = self.platform.staff_members["staff-1"]
        self.assertEqual(staff.assigned_shift, "Night Shift")
        self.assertEqual(staff.assigned_vehicle_id, "amb-2")

    def test_stock_take_auto_reconciles(self) -> None:
        self.platform.add_inventory_item(
            InventoryItem(item_id="item-3", name="Gloves", asset_type=AssetType.CONSUMABLE, quantity=100)
        )
        discrepancies = self.platform.run_stock_take(
            [StockChecklistEntry(item_id="item-3", counted_quantity=92)]
        )

        self.assertEqual(discrepancies["item-3"]["system_quantity"], 100)
        self.assertEqual(discrepancies["item-3"]["counted_quantity"], 92)
        self.assertEqual(self.platform.inventory_items["item-3"].quantity, 92)


if __name__ == "__main__":
    unittest.main()
